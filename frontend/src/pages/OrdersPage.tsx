import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '../api/endpoints';
import { formatPrice, formatDate, orderStatusLabel } from '@shopcore/shared';
import { useAuthStore } from '../store/authStore';

export function OrdersPage() {
  const role = useAuthStore((s) => s.user?.role);
  const { data, isLoading } = useQuery({ queryKey: ['orders'], queryFn: () => ordersApi.list(1) });

  if (isLoading) return <p className="muted">Завантаження...</p>;

  return (
    <div>
      <h1 className="page-title">{role === 'admin' ? 'Усі замовлення' : 'Мої замовлення'}</h1>
      {!data || data.items.length === 0 ? (
        <p className="muted">Замовлень поки немає.</p>
      ) : (
        <div className="orders-table card">
          <div className="orders-head">
            <span>Замовлення</span>
            <span>Дата</span>
            <span>Статус</span>
            <span>Сума</span>
          </div>
          {data.items.map((o) => (
            <Link key={o.id} to={`/orders/${o.id}`} className="orders-row">
              <span className="mono">#{o.id.slice(0, 8)}</span>
              <span>{formatDate(o.created_at)}</span>
              <span className={`status-pill status-${o.status}`}>
                {orderStatusLabel(o.status, o.payment_method)}
              </span>
              <span>{formatPrice(o.total_cents)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
