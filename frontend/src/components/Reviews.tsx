import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { formatDate } from '@shopcore/shared';
import { Stars } from './Stars';

export function Reviews({ productId }: { productId: string }) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const isCustomer = user?.role === 'customer';

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => reviewsApi.list(productId),
  });

  const mine = data?.items.find((r) => r.user_id === user?.id);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');

  // Підставляємо власний відгук у форму для редагування.
  useEffect(() => {
    if (mine) {
      setRating(mine.rating);
      setBody(mine.body);
    }
    // Скидаємо форму лише при зміні самого відгуку (id), а не на кожен рефетч —
    // інакше правки користувача затиратимуться.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine?.id]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
    queryClient.invalidateQueries({ queryKey: ['product', productId] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const submit = useMutation({
    mutationFn: () => reviewsApi.submit(productId, { rating, body }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: () => reviewsApi.remove(productId),
    onSuccess: () => {
      setRating(5);
      setBody('');
      refresh();
    },
  });

  if (isLoading || !data) return <p className="muted">Завантаження відгуків...</p>;

  const max = Math.max(1, ...Object.values(data.distribution));

  return (
    <section className="reviews">
      <h2 className="reviews-title">
        Відгуки {data.count > 0 && <span className="muted">· {data.count}</span>}
      </h2>

      {data.count > 0 && (
        <div className="reviews-summary card">
          <div className="rs-score">
            <div className="rs-avg">{data.average.toFixed(1)}</div>
            <Stars value={data.average} size="md" />
            <div className="muted" style={{ fontSize: '0.82rem' }}>
              {data.count} оцінок
            </div>
          </div>
          <div className="rs-bars">
            {[5, 4, 3, 2, 1].map((star) => {
              const n = data.distribution[String(star)] ?? 0;
              return (
                <div className="rs-bar-row" key={star}>
                  <span className="rs-star">{star} ★</span>
                  <div className="rs-bar">
                    <div className="rs-fill" style={{ width: `${(n / max) * 100}%` }} />
                  </div>
                  <span className="rs-count">{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isCustomer && (
        <div className="review-form card">
          <h3>{mine ? 'Ваш відгук' : 'Залишити відгук'}</h3>
          <div className="rf-rating">
            <span className="muted">Оцінка:</span>
            <Stars value={rating} size="lg" onChange={setRating} />
          </div>
          <textarea
            rows={3}
            placeholder="Поділіться враженнями про товар..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="rf-actions">
            {mine && (
              <button
                className="btn btn-ghost btn-sm"
                disabled={remove.isPending}
                onClick={() => remove.mutate()}
              >
                Видалити
              </button>
            )}
            <button
              className="btn btn-primary btn-sm"
              disabled={submit.isPending}
              onClick={() => submit.mutate()}
            >
              {submit.isPending ? 'Збереження...' : mine ? 'Оновити відгук' : 'Опублікувати'}
            </button>
          </div>
        </div>
      )}

      {data.items.length === 0 ? (
        <p className="muted">Відгуків ще немає. Будьте першим!</p>
      ) : (
        <div className="review-list">
          {data.items.map((r) => (
            <div className="review card" key={r.id}>
              <div className="review-head">
                <div>
                  <strong>{r.author_name}</strong>
                  {r.verified && <span className="verified">✓ підтверджена покупка</span>}
                </div>
                <span className="muted" style={{ fontSize: '0.78rem' }}>
                  {formatDate(r.created_at)}
                </span>
              </div>
              <Stars value={r.rating} />
              {r.body && <p className="review-body">{r.body}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
