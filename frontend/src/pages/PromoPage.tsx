import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { productsApi } from '../api/endpoints';
import { ProductCard } from '../components/ProductCard';

export function PromoPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['promo', page],
    queryFn: () => productsApi.list({ promo: true, sort: 'discount', page, limit: 12 }),
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <h1 className="page-title">Акції</h1>
      <p className="page-sub muted">Товари зі знижкою — встигніть купити вигідно.</p>

      {isLoading && <p className="muted">Завантаження...</p>}
      {isError && <p className="error">Не вдалося завантажити акції.</p>}

      {data && data.items.length === 0 ? (
        <div className="empty-state">
          <p className="muted">Наразі акцій немає. Зазирніть пізніше.</p>
          <Link to="/" className="btn btn-primary">
            До каталогу
          </Link>
        </div>
      ) : (
        <div className="grid">
          {data?.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="pagination">
          <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            ← Назад
          </button>
          <span>
            Сторінка {data.page} з {data.pages}
          </span>
          <button
            className="btn btn-ghost"
            disabled={data.page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Далі →
          </button>
        </div>
      )}
    </div>
  );
}
