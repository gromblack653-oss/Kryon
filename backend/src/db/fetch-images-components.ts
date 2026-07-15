/**
 * Збирач фото комплектуючих (CPU/БЖ/корпуси/RAM) із Wikimedia Commons.
 * Відновлюваний: читає/пише JSON із argv[2], пропускає вже зібране.
 * Запуск:  tsx src/db/fetch-images-components.ts <out.json>
 */
import fs from 'fs';
import { componentProducts } from './seed.components';

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'ShopCoreDemo/1.0 (fullstack portfolio project; educational use)';
const VENDORS = [
  'be quiet!', 'Cooler Master', 'Fractal Design', 'Lian Li', 'G.Skill',
  'Corsair', 'Seasonic', 'Deepcool', 'Chieftec', 'Kingston', 'Crucial',
  'Patriot', 'ASUS', 'NZXT', 'MSI', 'AMD', 'Intel',
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const glue = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Модельний токен без назви виробника. */
function modelToken(title: string): string {
  const vendor = VENDORS.find((v) => title.toLowerCase().startsWith(v.toLowerCase()));
  const model = vendor ? title.slice(vendor.length) : title;
  return glue(model);
}

interface Cand { index: number; title: string; url: string; mediatype?: string; mime?: string }

async function search(query: string): Promise<Cand[]> {
  const url =
    `${API}?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}` +
    `&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|mime|mediatype&iiurlwidth=800&format=json`;
  let res: Response | null = null;
  for (let a = 0; a < 4; a++) {
    res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status !== 429) break;
    await sleep(2500 * (a + 1));
  }
  if (!res || !res.ok) throw new Error(`HTTP ${res?.status ?? 'no-response'}`);
  const data = (await res.json()) as {
    query?: { pages?: Record<string, { index: number; title: string; imageinfo?: Array<{ thumburl?: string; url: string; mime?: string; mediatype?: string }> }> };
  };
  const out: Cand[] = [];
  for (const p of Object.values(data.query?.pages ?? {})) {
    const info = p.imageinfo?.[0];
    if (info) out.push({ index: p.index, title: p.title, url: info.thumburl ?? info.url, mediatype: info.mediatype, mime: info.mime });
  }
  return out.sort((a, b) => a.index - b.index);
}

function pick(cands: Cand[], token: string): Cand | null {
  return (
    cands.find(
      (c) =>
        c.mediatype === 'BITMAP' &&
        ['image/jpeg', 'image/png', 'image/webp'].includes(c.mime ?? '') &&
        glue(c.title).includes(token),
    ) ?? null
  );
}

async function run(): Promise<void> {
  const outPath = process.argv[2];
  if (!outPath) throw new Error('Вкажіть шлях до JSON');
  const result: Record<string, string> = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : {};

  const pending = componentProducts.filter((p) => !result[p.slug]);
  process.stderr.write(`Зібрано: ${Object.keys(result).length}, залишилось: ${pending.length}\n`);

  for (const p of pending) {
    const token = modelToken(p.title);
    let picked: Cand | null = null;
    try {
      picked = pick(await search(p.title), token);
    } catch (err) {
      process.stderr.write(`ERR ${p.slug}: ${String(err)}\n`);
    }
    if (picked) {
      result[p.slug] = picked.url;
      fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
      process.stderr.write(`OK  ${p.slug.padEnd(28)} <- ${picked.title}\n`);
    } else {
      process.stderr.write(`--  ${p.slug.padEnd(28)} (не знайдено)\n`);
    }
    await sleep(2500);
  }
  process.stderr.write(`\nВсього: ${Object.keys(result).length}/${componentProducts.length}\n`);
}

run();
