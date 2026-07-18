// Генерує src/lib/brandLogos.ts — SVG-контури логотипів наших брендів із simple-icons (CC0).
// Запуск із теки frontend:  node scripts/gen-brand-logos.mjs
import * as simpleIcons from 'simple-icons';
import { writeFileSync } from 'fs';

// Бренди з нашого каталогу (нормалізований ключ → варіанти пошуку в simple-icons).
const VENDORS = [
  'NVIDIA',
  'AMD',
  'Intel',
  'Corsair',
  'Seasonic',
  'be quiet!',
  'Cooler Master',
  'Deepcool',
  'Chieftec',
  'Kingston',
  'G.Skill',
  'Crucial',
  'Patriot',
  'ASUS',
  'NZXT',
  'Fractal Design',
  'MSI',
  'Lian Li',
];

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const icons = Object.values(simpleIcons).filter((i) => i && i.slug && i.path);

const result = {};
for (const vendor of VENDORS) {
  const nv = norm(vendor);
  // Точний збіг за slug/title, інакше — icon, що починається з назви бренду.
  const exact = icons.find((i) => norm(i.slug) === nv || norm(i.title) === nv);
  const prefix = icons.find((i) => norm(i.slug).startsWith(nv) || norm(i.title).startsWith(nv));
  const icon = exact ?? prefix;
  if (icon) {
    result[nv] = { title: vendor, path: icon.path, hex: `#${icon.hex}` };
  }
}

const found = Object.keys(result);
const missing = VENDORS.filter((v) => !result[norm(v)]);

let out = '// АВТОЗГЕНЕРОВАНО (scripts/gen-brand-logos.mjs) з simple-icons (CC0).\n';
out += '// Логотипи брендів для плейсхолдерів товарів без фото.\n\n';
out +=
  'export interface BrandLogo {\n  title: string;\n  path: string; // SVG path (viewBox 0 0 24 24)\n  hex: string;\n}\n\n';
out += 'export const brandLogos: Record<string, BrandLogo> = {\n';
for (const [key, v] of Object.entries(result)) {
  out += `  ${JSON.stringify(key)}: { title: ${JSON.stringify(v.title)}, hex: ${JSON.stringify(v.hex)}, path: ${JSON.stringify(v.path)} },\n`;
}
out += '};\n';

writeFileSync('src/lib/brandLogos.ts', out);
console.log(`Знайдено логотипів: ${found.length}/${VENDORS.length}`);
console.log('Є:', found.join(', '));
console.log('Немає (буде текст):', missing.join(', ') || '—');
