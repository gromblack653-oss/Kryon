import fs from 'fs';
import path from 'path';
import { products } from '../../src/db/seed.data';
import { componentProducts } from '../../src/db/seed.components';

const dir = process.argv[2];
const files = fs.readdirSync(dir);
const gpuSlugs = new Set(products.map((p) => p.slug));
const compSlugs = new Set(componentProducts.map((p) => p.slug));

// slug -> локальний шлях (без галерейних __gN)
const cover = new Map<string, string>();
const gallery = new Map<string, string[]>();
for (const f of files.sort()) {
  const base = f.replace(/\.[^.]+$/, '');
  const url = `/uploads/products/${f}`;
  const g = /^(.*)__g(\d+)$/.exec(base);
  if (g) {
    const arr = gallery.get(g[1]) ?? [];
    arr.push(url);
    gallery.set(g[1], arr);
  } else {
    cover.set(base, url);
  }
}

const gpuMap: Record<string, string> = {};
const compMap: Record<string, string> = {};
for (const [slug, url] of cover) {
  if (gpuSlugs.has(slug)) gpuMap[slug] = url;
  else if (compSlugs.has(slug)) compMap[slug] = url;
}
const extraMap: Record<string, string[]> = {};
for (const [slug, urls] of gallery) extraMap[slug] = urls;

const missGpu = [...gpuSlugs].filter((s) => !gpuMap[s]);
const missComp = [...compSlugs].filter((s) => !compMap[s]);
process.stderr.write(`GPU покрито ${Object.keys(gpuMap).length}/${gpuSlugs.size}; комплектуючі ${Object.keys(compMap).length}/${compSlugs.size}\n`);
if (missGpu.length) process.stderr.write(`GPU без фото: ${missGpu.join(', ')}\n`);
if (missComp.length) process.stderr.write(`Компл. без фото: ${missComp.join(', ')}\n`);

const gpuSorted = Object.keys(gpuMap).sort().reduce((a, k) => ((a[k] = gpuMap[k]), a), {} as Record<string, string>);
const compSorted = Object.keys(compMap).sort().reduce((a, k) => ((a[k] = compMap[k]), a), {} as Record<string, string>);

const imagesTs = `/**
 * Зображення відеокарт — самохостинг у backend/uploads/products.
 * Джерела: офіційні сайти виробників / Amazon / Wikimedia (curated), завантажені локально.
 * АВТОГЕНЕРовано скриптом _genmaps.ts за вмістом теки. Не редагувати вручну.
 */
export const extraProductImages: Record<string, string[]> = ${JSON.stringify(extraMap, null, 2)};

export const productImages: Record<string, string> = ${JSON.stringify(gpuSorted, null, 2)};
`;
const compTs = `/**
 * Фото комплектуючих — самохостинг у backend/uploads/products.
 * АВТОГЕНЕРовано скриптом _genmaps.ts за вмістом теки. Не редагувати вручну.
 */
export const componentImages: Record<string, string> = ${JSON.stringify(compSorted, null, 2)};
`;
fs.writeFileSync(path.join(process.cwd(), 'src/db/seed.images.ts'), imagesTs);
fs.writeFileSync(path.join(process.cwd(), 'src/db/seed.components-images.ts'), compTs);
process.stderr.write('Записано seed.images.ts та seed.components-images.ts\n');
