import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../api/endpoints';
import { useCompareStore } from '../store/compareStore';
import { ProductImage } from '../components/ProductImage';
import { formatPrice } from '@shopcore/shared';

export function ComparePage() {
  const ids = useCompareStore((s) => s.ids);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);

  const { data: products, isLoading } = useQuery({
    queryKey: ['compare', ids],
    queryFn: () => productsApi.compare(ids),
    enabled: ids.length > 0,
  });

  if (ids.length === 0) {
    return (
      <div className="empty-state">
        <h1 className="page-title">Порівняння</h1>
        <p className="muted">Ви ще не додали товарів до порівняння. Натисніть ⇄ на картці товару.</p>
        <Link to="/" className="btn btn-primary">
          До каталогу
        </Link>
      </div>
    );
  }

  if (isLoading || !products) return <p className="muted">Завантаження...</p>;

  // Об'єднаний упорядкований список характеристик.
  const labelByKey = new Map<string, { label: string; unit: string | null }>();
  for (const p of products) {
    for (const a of p.attributes ?? []) {
      if (!labelByKey.has(a.key)) labelByKey.set(a.key, { label: a.label, unit: a.unit });
    }
  }
  const valueOf = (productIdx: number, key: string) => {
    const a = products[productIdx].attributes?.find((x) => x.key === key);
    if (!a) return '—';
    return a.value + (a.unit ? ` ${a.unit}` : '');
  };
  const rowDiffers = (key: string) => {
    const vals = products.map((_, i) => valueOf(i, key));
    return new Set(vals).size > 1;
  };

  return (
    <div>
      <div className="results-head">
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          Порівняння · {products.length}
        </h1>
        <button className="btn btn-ghost btn-sm" onClick={clear}>
          Очистити все
        </button>
      </div>

      <div className="compare-scroll">
        <table className="compare-table">
          <thead>
            <tr>
              <th className="corner"></th>
              {products.map((p) => (
                <th key={p.id}>
                  <div className="cmp-head">
                    <div className="cmp-thumb">
                      <ProductImage product={p} compact />
                    </div>
                    <Link to={`/products/${p.id}`} className="cmp-title">
                      {p.title}
                    </Link>
                    <div className="cmp-price">{formatPrice(p.price_cents)}</div>
                    <button className="cmp-remove" onClick={() => remove(p.id)}>
                      ✕ прибрати
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="rk">Наявність</td>
              {products.map((p) => (
                <td key={p.id}>
                  {p.stock > 0 ? (
                    <span className="stock in">В наявності</span>
                  ) : (
                    <span className="stock out">Немає</span>
                  )}
                </td>
              ))}
            </tr>
            {[...labelByKey.entries()].map(([key, meta]) => (
              <tr key={key} className={rowDiffers(key) ? 'diff' : ''}>
                <td className="rk">{meta.label}</td>
                {products.map((_, i) => (
                  <td key={i} className="mono">
                    {valueOf(i, key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
