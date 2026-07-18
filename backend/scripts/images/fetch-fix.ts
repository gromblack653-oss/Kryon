/**
 * Цільовий до-збирач: для проблемних товарів перебирає кандидатів DDG і
 * ЗАВАНТАЖУЄ перший, що реально качається у валідне зображення (magic-байти).
 * Пріоритет — Amazon (надійно віддає без hotlink-захисту).
 * Запуск: tsx src/db/fetch-fix.ts <destDir> <slug1,slug2,...>
 */
import fs from 'fs';
import path from 'path';
import { products } from '../../src/db/seed.data';
import { componentProducts } from '../../src/db/seed.components';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const SUFFIX: Record<string, string> = {
  gpu: 'graphics card',
  cpu: 'cpu processor',
  ram: 'ram memory',
  psu: 'power supply',
  case: 'pc case',
  mobo: 'motherboard',
};
const REJECT_URL =
  /\.svg|\.gif|data:|youtube|ytimg|reddit|pinterest|pinimg|lookaside|fbcdn|alamy|shutterstock|istockphoto|dreamstime|123rf|gettyimages|aliexpress/i;
const VENDOR_WORDS =
  /\b(nvidia|geforce|amd|radeon|ryzen|intel|core|arc|corsair|seasonic|be quiet!?|cooler master|deepcool|chieftec|kingston|g\.?skill|crucial|patriot|asus|rog|tuf|nzxt|msi|lian li|gigabyte|zotac|palit|xfx|sapphire|pny|fractal|design|gaming|edition)\b/gi;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const glue = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
// Стандартні частоти RAM — прибираємо з токена (у заголовках фото їх часто нема).
const RAM_SPEEDS = /\b(2133|2400|2666|2933|3000|3200|3600|4000|4266|4800|5200|5600|6000|6400|7200|8000)\b/g;
const modelToken = (t: string) =>
  glue(
    t
      .replace(VENDOR_WORDS, ' ')
      .replace(/\b\d+\s?gb\b/gi, ' ')
      .replace(/\bddr\d\b/gi, ' ')
      .replace(RAM_SPEEDS, ' '),
  );

interface DdgResult {
  title: string;
  image: string;
  width?: number;
  height?: number;
}

async function search(query: string): Promise<DdgResult[]> {
  const tk = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`, {
    headers: { 'User-Agent': UA },
  });
  const vqd = (/vqd=["']?([\d-]+)["']?/.exec(await tk.text()) ?? [])[1];
  if (!vqd) return [];
  await sleep(400);
  const r = await fetch(
    `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,&p=1`,
    {
      headers: { 'User-Agent': UA, Referer: 'https://duckduckgo.com/' },
    },
  );
  if (!r.ok) return [];
  return ((await r.json()) as { results?: DdgResult[] }).results ?? [];
}

/** Пріоритет джерела: Amazon найнадійніше качається; далі офіційні/ретейл. */
function hostRank(u: string): number {
  const h = new URL(u).host;
  if (/m\.media-amazon\.com|ssl-images-amazon/i.test(h)) return 0;
  if (/newegg|bhphoto|scan\.co\.uk|overclockers|caseking|alternate/i.test(h)) return 1;
  if (
    /asset\.msi|asrock|amd\.com|nvidia|corsair|seasonic|kingston|nzxt|deepcool|coolermaster|lian-?li|fractal|gskill|crucial|zotac|palit|xfx|sapphire|pny|gigabyte|asus/i.test(
      h,
    )
  )
    return 2;
  return 3;
}

/** Валідне зображення за magic-байтами. */
function validImage(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf.length < 4000) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP')
    return 'webp';
  return null;
}

async function download(url: string): Promise<{ buf: Buffer; ext: string } | null> {
  try {
    const origin = new URL(url).origin;
    const r = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        Accept: 'image/avif,image/webp,image/png,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: origin + '/',
      },
    });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const ext = validImage(buf);
    return ext ? { buf, ext } : null;
  } catch {
    return null;
  }
}

async function run(): Promise<void> {
  const destDir = process.argv[2];
  const slugs = (process.argv[3] ?? '').split(',').filter(Boolean);
  if (!destDir || !slugs.length) throw new Error('Вкажіть <destDir> <slug1,slug2,...>');

  const byslug = new Map<string, { title: string; type: string }>();
  for (const p of products) byslug.set(p.slug, { title: p.title, type: 'gpu' });
  for (const p of componentProducts) byslug.set(p.slug, { title: p.title, type: p.type });

  for (const slug of slugs) {
    const info = byslug.get(slug);
    if (!info) {
      process.stderr.write(`?? ${slug} — немає в сідері\n`);
      continue;
    }
    const token = modelToken(info.title);
    const query = `${info.title} ${SUFFIX[info.type] ?? ''}`.trim();
    let results: DdgResult[] = [];
    try {
      results = await search(query);
    } catch (e) {
      process.stderr.write(`ERR ${slug}: ${e}\n`);
    }

    // Кандидати: валідний тип+хост; заголовок містить токен (для RAM токен короткий — не блокуємо).
    const cands = results
      .filter(
        (c) =>
          /^https:\/\//.test(c.image) &&
          /\.(jpe?g|png|webp)(\?|$|&)/i.test(c.image) &&
          !REJECT_URL.test(c.image),
      )
      .filter((c) => (token.length >= 4 ? glue(c.title).includes(token) : true))
      .filter((c) => !(c.width && c.height && c.width / c.height > 2.2))
      .sort((a, b) => hostRank(a.image) - hostRank(b.image));

    // Режим перегляду: друкуємо кандидатів (заголовок+хост), нічого не качаємо.
    if (process.env.LIST === '1') {
      process.stderr.write(`\n### ${slug} (token=${token})\n`);
      cands
        .slice(0, 10)
        .forEach((c, i) =>
          process.stderr.write(
            `  [${i}] ${c.title.slice(0, 60).padEnd(61)} ${new URL(c.image).host}\n    ${c.image}\n`,
          ),
        );
      continue;
    }

    // Ручний вибір кандидата: PICK="slug:index,slug:index" (після перегляду LIST=1).
    const pickIdx = Object.fromEntries(
      (process.env.PICK ?? '')
        .split(',')
        .filter(Boolean)
        .map((s) => s.split(':')),
    )[slug];
    const ordered = pickIdx !== undefined ? [cands[Number(pickIdx)], ...cands].filter(Boolean) : cands;

    let saved = false;
    for (const c of ordered.slice(0, 12)) {
      const d = await download(c.image);
      if (d) {
        // прибираємо старий файл будь-якого розширення
        for (const e of ['jpg', 'jpeg', 'png', 'webp']) {
          const f = path.join(destDir, `${slug}.${e}`);
          if (fs.existsSync(f)) fs.unlinkSync(f);
        }
        fs.writeFileSync(path.join(destDir, `${slug}.${d.ext}`), d.buf);
        process.stderr.write(
          `OK  ${slug.padEnd(26)} ${new URL(c.image).host} (${Math.round(d.buf.length / 1024)}KB)\n`,
        );
        saved = true;
        break;
      }
      await sleep(300);
    }
    if (!saved)
      process.stderr.write(`--  ${slug.padEnd(26)} (жоден кандидат не завантажився; token=${token})\n`);
    await sleep(1200);
  }
}

run();
