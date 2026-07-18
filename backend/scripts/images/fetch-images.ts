/**
 * Одноразовий збирач зображень відеокарт із Wikimedia Commons (відкриті ліцензії CC).
 * Для кожної моделі шукає растрове фото, застосовує фільтри якості й захист від
 * плутанини варіантів (Ti/Super/XT/XTX/GRE), друкує JSON-мапу slug → url.
 *
 * Запуск:  tsx src/db/fetch-images.ts
 */
import fs from 'fs';
import { products } from '../../src/db/seed.data';

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'ShopCoreDemo/1.0 (fullstack portfolio project; educational use)';
const THUMB_W = 800;

interface Candidate {
  index: number;
  title: string;
  url: string;
  mediatype?: string;
  mime?: string;
}

const SIBLING_SUFFIXES = ['ti', 'super', 'xtx', 'xt', 'gre'];

/** Модельний токен без вендора та розміру памʼяті: "rtx 5070 ti", "rx 9060 xt", "arc a770". */
function modelToken(title: string): string {
  return title
    .replace(/\b(nvidia|geforce|amd|radeon|intel)\b/gi, '')
    .replace(/\b\d+\s?gb\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Прибирає пробіли/пунктуацію: "RX 7800 XT" → "rx7800xt". Нівелює різнобій у назвах. */
function glue(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Чи продовжується токен «чужою» моделлю: інший суфікс (Ti/Super/XT/XTX/GRE),
 * зайва літера після XT (→ XTX) або інша цифра. Працює на склеєному рядку.
 */
function hasWrongSibling(rest: string, token: string): boolean {
  if (/^\d/.test(rest) && !/^\d+gb\b/.test(rest)) return true; // інший номер (але не обсяг памʼяті)
  if (token.endsWith('xt') && !token.endsWith('xtx') && rest.startsWith('x')) return true; // XT → XTX
  return SIBLING_SUFFIXES.some((suf) => !token.endsWith(suf) && rest.startsWith(suf));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function search(query: string): Promise<Candidate[]> {
  const url =
    `${API}?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}` +
    `&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|mime|mediatype` +
    `&iiurlwidth=${THUMB_W}&format=json`;

  // Retry з експоненційним backoff на 429 (rate limit).
  let res: Response | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status !== 429) break;
    await sleep(2000 * (attempt + 1));
  }
  if (!res || !res.ok) throw new Error(`HTTP ${res?.status ?? 'no-response'}`);

  const data = (await res.json()) as {
    query?: { pages?: Record<string, { index: number; title: string; imageinfo?: Array<{ thumburl?: string; url: string; mime?: string; mediatype?: string }> }> };
  };
  const pages = data.query?.pages ?? {};
  const candidates: Candidate[] = [];
  for (const p of Object.values(pages)) {
    const info = p.imageinfo?.[0];
    if (!info) continue;
    candidates.push({
      index: p.index,
      title: p.title,
      url: info.thumburl ?? info.url,
      mediatype: info.mediatype,
      mime: info.mime,
    });
  }
  return candidates.sort((a, b) => a.index - b.index);
}

/** Числовий токен без префікса серії: "rx 7800 xt" → "7800 xt", "arc a770" → "a770". */
function numericToken(token: string): string {
  return token.replace(/^(rtx|gtx|rx|arc)\s+/, '');
}

function matches(title: string, token: string): boolean {
  const gTitle = glue(title);
  const gToken = glue(token);
  const at = gTitle.indexOf(gToken);
  if (at === -1) return false;
  return !hasWrongSibling(gTitle.slice(at + gToken.length), gToken);
}

function isPhoto(c: Candidate): boolean {
  return c.mediatype === 'BITMAP' && ['image/jpeg', 'image/png', 'image/webp'].includes(c.mime ?? '');
}

/**
 * Два рівні збігу: спершу повний токен ("rx 7800 xt"), потім числовий ("7800 xt")
 * для назв без префікса серії (напр. "Sapphire Pulse 7800 XT").
 */
function pickBest(candidates: Candidate[], token: string): Candidate | null {
  const photos = candidates.filter(isPhoto);
  const short = numericToken(token);
  return (
    photos.find((c) => matches(c.title, token)) ??
    (short !== token ? photos.find((c) => matches(c.title, short)) : undefined) ??
    null
  );
}

async function run(): Promise<void> {
  // Відновлюваний прохід: результат читаємо/пишемо у файл із argv[2].
  const outPath = process.argv[2];
  if (!outPath) throw new Error('Вкажіть шлях до вихідного JSON: tsx fetch-images.ts <out.json>');

  const result: Record<string, string> = fs.existsSync(outPath)
    ? JSON.parse(fs.readFileSync(outPath, 'utf8'))
    : {};

  const pending = products.filter((p) => !result[p.slug]);
  process.stderr.write(`Уже зібрано: ${Object.keys(result).length}, залишилось: ${pending.length}\n`);

  for (const p of pending) {
    const token = modelToken(p.title);
    let picked: Candidate | null = null;
    try {
      let cands = await search(p.title);
      if (cands.length === 0) {
        // Порожня відповідь часто означає тротлінг — повторюємо раз після паузи.
        await sleep(4000);
        cands = await search(p.title);
      }
      picked = pickBest(cands, token);
    } catch (err) {
      process.stderr.write(`ERR ${p.slug}: ${String(err)}\n`);
    }

    if (picked) {
      result[p.slug] = picked.url;
      fs.writeFileSync(outPath, JSON.stringify(result, null, 2)); // інкрементальне збереження
      process.stderr.write(`OK  ${p.slug.padEnd(22)} <- ${picked.title}\n`);
    } else {
      process.stderr.write(`--  ${p.slug.padEnd(22)} (не знайдено)\n`);
    }
    await sleep(Number(process.env.DELAY_MS ?? 3500)); // пауза між моделями (Wikimedia rate limit)
  }

  process.stderr.write(`\nВсього зібрано: ${Object.keys(result).length}/${products.length}\n`);
}

run();
