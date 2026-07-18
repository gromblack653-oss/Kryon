/**
 * Збирач товарних фото через DuckDuckGo Images (для портфоліо — nominative use).
 * DDG віддає JSON із заголовком+джерелом і майже не тротлить.
 * Якість: вимагаємо збіг токена моделі в заголовку; пріоритет офіційним/Amazon хостам.
 * Відновлюваний. Запуск: tsx src/db/fetch-ddg.ts <out.json>
 */
import fs from 'fs';
import { products } from '../../src/db/seed.data';
import { componentProducts } from '../../src/db/seed.components';
import { productImages } from '../../src/db/seed.images';
import { componentImages } from '../../src/db/seed.components-images';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

const SUFFIX: Record<string, string> = {
  gpu: 'graphics card',
  cpu: 'cpu processor',
  ram: 'ram memory',
  psu: 'power supply',
  case: 'pc case',
};

// Пріоритетні хости (чисті product-shots), у порядку переваги.
const PREFERRED = [
  /asset\.msi\.com|dlcdnwebimgs\.asus\.com|static\.gigabyte\.com|images\.nvidia\.com|\.amd\.com|corsair\.com|seasonic\.com|kingston\.com|nzxt\.com|deepcool\.com|coolermaster\.com|lian-?li\.com|fractal-design\.com|gskill\.com|crucial\.com|patriot|zotac\.com|palit\.com|xfx\.com|sapphire|pny\.com|gigabyte\.com|asrock\.com/i, // офіційні
  /m\.media-amazon\.com|images-(na|eu)\.ssl-images-amazon/i, // Amazon
  /newegg|bhphoto|scan\.co\.uk|overclockers|caseking|alternate|rozetka|telemart|comfy/i, // ретейлери
];
const REJECT_URL =
  /\.svg|\.gif|data:|youtube|ytimg|reddit|pinterest|pinimg|lookaside|fbcdn|alamy|shutterstock|istockphoto|dreamstime|123rf|gettyimages|ebayimg|aliexpress|clubic/i;

// Бренди прибираємо з токена моделі; серії (Fury/Beast/Trident/Viper) лишаємо.
const VENDOR_WORDS =
  /\b(nvidia|geforce|amd|radeon|ryzen|intel|core|arc|corsair|seasonic|be quiet!?|cooler master|deepcool|chieftec|kingston|g\.?skill|crucial|patriot|asus|rog|tuf|nzxt|msi|lian li|gigabyte|zotac|palit|xfx|sapphire|pny|fractal|design|gaming|edition)\b/gi;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const glue = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const modelToken = (title: string): string =>
  glue(
    title
      .replace(VENDOR_WORDS, ' ')
      .replace(/\b\d+\s?gb\b/gi, ' ')
      .replace(/\bddr\d\b/gi, ' '),
  );

interface DdgResult {
  title: string;
  image: string;
  source?: string;
  width?: number;
  height?: number;
}

async function vqdToken(query: string): Promise<string | null> {
  const r = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`, {
    headers: { 'User-Agent': UA },
  });
  const html = await r.text();
  return (/vqd=["']?([\d-]+)["']?/.exec(html) ?? [])[1] ?? null;
}

async function search(query: string): Promise<DdgResult[]> {
  const vqd = await vqdToken(query);
  if (!vqd) return [];
  await sleep(400);
  const r = await fetch(
    `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,&p=1`,
    { headers: { 'User-Agent': UA, Referer: 'https://duckduckgo.com/' } },
  );
  if (!r.ok) return [];
  const j = (await r.json()) as { results?: DdgResult[] };
  return j.results ?? [];
}

function pickBest(results: DdgResult[], token: string): string | null {
  const valid = results.filter((c) => {
    if (!/^https:\/\//.test(c.image) || REJECT_URL.test(c.image)) return false;
    if (!/\.(jpe?g|png|webp)(\?|$|&)/i.test(c.image)) return false;
    // Заголовок мусить містити числовий токен моделі.
    if (token.length >= 3 && !glue(c.title).includes(token)) return false;
    // Квадратні/портретні product-shots краще; відсіюємо надто широкі банери.
    if (c.width && c.height && c.width / c.height > 2.2) return false;
    return true;
  });
  if (!valid.length) return null;
  for (const rx of PREFERRED) {
    const hit = valid.find((c) => rx.test(new URL(c.image).host));
    if (hit) return hit.image;
  }
  return valid[0].image;
}

async function run(): Promise<void> {
  const outPath = process.argv[2];
  if (!outPath) throw new Error('Вкажіть шлях до JSON');
  const result: Record<string, string> = fs.existsSync(outPath)
    ? JSON.parse(fs.readFileSync(outPath, 'utf8'))
    : {};

  const good = new Set([...Object.keys(productImages), ...Object.keys(componentImages)]);
  const all = [
    ...products.map((p) => ({ slug: p.slug, title: p.title, type: 'gpu' })),
    ...componentProducts.map((p) => ({ slug: p.slug, title: p.title, type: p.type })),
  ];
  const targets = all.filter((p) => !good.has(p.slug) && !result[p.slug]);
  process.stderr.write(`Ціль: ${targets.length} (зібрано ${Object.keys(result).length})\n`);

  for (const p of targets) {
    const query = `${p.title} ${SUFFIX[p.type] ?? ''}`.trim();
    const token = modelToken(p.title);
    let picked: string | null = null;
    try {
      picked = pickBest(await search(query), token);
    } catch (err) {
      process.stderr.write(`ERR ${p.slug}: ${String(err)}\n`);
    }
    if (picked) {
      result[p.slug] = picked;
      fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
      process.stderr.write(`OK  ${p.slug.padEnd(26)} ${new URL(picked).host}\n`);
    } else {
      process.stderr.write(`--  ${p.slug.padEnd(26)} (нічого)\n`);
    }
    await sleep(Number(process.env.DELAY_MS ?? 1500));
  }
  process.stderr.write(`\nЗібрано: ${Object.keys(result).length}\n`);
}

run();
