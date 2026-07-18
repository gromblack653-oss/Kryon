import type { Product } from '../types';
import { brandLogos } from '../lib/brandLogos';
import { assetUrl } from '../lib/assetUrl';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// Виробники чипів відеокарт — власні фірмові кольори градієнта.
const CHIP_BRANDS: Array<{ test: RegExp; key: string; name: string; gradient: string }> = [
  { test: /nvidia|geforce|rtx|gtx/i, key: 'nvidia', name: 'NVIDIA', gradient: 'linear-gradient(135deg,#0f1a0a,#2d4a10)' },
  { test: /radeon|\bamd\b|\brx\b/i, key: 'amd', name: 'AMD', gradient: 'linear-gradient(135deg,#1a0a0b,#5a0f14)' },
  { test: /\bintel\b|\barc\b/i, key: 'intel', name: 'Intel', gradient: 'linear-gradient(135deg,#0a1420,#00396b)' },
];

// Виробники комплектуючих — впізнаємо за початком назви.
const VENDORS = [
  'be quiet!', 'Cooler Master', 'Fractal Design', 'Lian Li', 'G.Skill',
  'Corsair', 'Seasonic', 'Deepcool', 'Chieftec', 'Kingston', 'Crucial',
  'Patriot', 'ASUS', 'NZXT', 'MSI',
];

/** Детермінований відтінок за назвою (для брендів без фіксованого кольору). */
function hue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360;
}

interface Brand {
  key: string; // нормалізований ключ для пошуку логотипа
  name: string;
  gradient: string;
  model: string;
}

function resolveBrand(title: string): Brand {
  const vendor = VENDORS.find((v) => title.toLowerCase().startsWith(v.toLowerCase()));
  if (vendor) {
    const h = hue(vendor);
    return {
      key: norm(vendor),
      name: vendor.toUpperCase(),
      gradient: `linear-gradient(135deg, hsl(${h} 45% 8%), hsl(${h} 55% 18%))`,
      model: title.slice(vendor.length).trim(),
    };
  }
  const chip = CHIP_BRANDS.find((c) => c.test.test(title));
  if (chip) {
    return {
      key: chip.key,
      name: chip.name,
      gradient: chip.gradient,
      model: title.replace(/\b(nvidia|geforce|amd|radeon|intel)\b/gi, '').replace(/\s+/g, ' ').trim(),
    };
  }
  return { key: '', name: 'Kryon', gradient: 'linear-gradient(135deg,#1e293b,#334155)', model: title };
}

interface Props {
  product: Pick<Product, 'title' | 'image_url'>;
  compact?: boolean;
}

/** Зображення товару: реальне фото, інакше — брендований плейсхолдер із логотипом. */
export function ProductImage({ product, compact }: Props) {
  if (product.image_url) {
    return <img className="media-img" src={assetUrl(product.image_url)} alt={product.title} loading="lazy" />;
  }

  const brand = resolveBrand(product.title);
  const logo = brandLogos[brand.key];

  return (
    <div className={`media-ph ${compact ? 'compact' : ''}`} style={{ background: brand.gradient }} aria-label={product.title}>
      {logo ? (
        <svg className="media-ph-logo" viewBox="0 0 24 24" role="img" aria-label={brand.name}>
          <path d={logo.path} fill="rgba(255,255,255,0.92)" />
        </svg>
      ) : (
        <span className="media-ph-brand">{brand.name}</span>
      )}
      {!compact && <span className="media-ph-model">{brand.model}</span>}
    </div>
  );
}
