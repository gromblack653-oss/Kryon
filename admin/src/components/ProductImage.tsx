import type { Product } from '../types';

interface Brand {
  name: string;
  gradient: string;
  accent: string;
}

const BRANDS: Array<{ test: RegExp } & Brand> = [
  { test: /nvidia|geforce|rtx|gtx/i, name: 'NVIDIA', accent: '#76B900', gradient: 'linear-gradient(135deg,#0f1a0a,#2d4a10)' },
  { test: /radeon|amd|\brx\b/i, name: 'AMD', accent: '#ED1C24', gradient: 'linear-gradient(135deg,#1a0a0b,#5a0f14)' },
  { test: /intel|\barc\b/i, name: 'Intel', accent: '#0071C5', gradient: 'linear-gradient(135deg,#0a1420,#00396b)' },
];

function brandOf(title: string): Brand {
  return (
    BRANDS.find((x) => x.test.test(title)) ?? {
      name: 'GPU',
      accent: '#6366f1',
      gradient: 'linear-gradient(135deg,#1e293b,#334155)',
    }
  );
}

function modelName(title: string): string {
  return title.replace(/\b(nvidia|geforce|amd|radeon|intel)\b/gi, '').replace(/\s+/g, ' ').trim();
}

interface Props {
  product: Pick<Product, 'title' | 'image_url'>;
  compact?: boolean;
}

export function ProductImage({ product, compact }: Props) {
  if (product.image_url) {
    return <img className="media-img" src={product.image_url} alt={product.title} loading="lazy" />;
  }
  const brand = brandOf(product.title);
  return (
    <div className={`media-ph ${compact ? 'compact' : ''}`} style={{ background: brand.gradient }}>
      <span className="media-ph-brand" style={{ color: brand.accent }}>
        {brand.name}
      </span>
      {!compact && <span className="media-ph-model">{modelName(product.title)}</span>}
    </div>
  );
}
