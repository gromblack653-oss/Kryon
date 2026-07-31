import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '../api/endpoints';
import { formatPrice, formatDate, orderStatusLabel, paymentStatusLabel } from '@shopcore/shared';
import type { DeliveryMethod, PaymentMethod } from '../types';

const DELIVERY_LABELS: Record<DeliveryMethod, string> = {
  np_warehouse: 'Нова Пошта — відділення',
  np_courier: 'Нова Пошта — курʼєр',
  pickup: 'Самовивіз',
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  card: 'Картка онлайн',
  cod: 'Накладений платіж',
};

export function OrderConfirmationPage() {
  const { id = '' } = useParams();

  const {
    data: order,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['order-confirmation', id],
    queryFn: () => ordersApi.confirmation(id),
    enabled: !!id,
  });

  if (isLoading) return <p className="muted">Завантаження...</p>;
  if (isError || !order) return <p className="error">Замовлення не знайдено.</p>;

  return (
    <div className="confirm-page">
      <div className="confirm-hero card">
        <div className="confirm-badge">✓</div>
        <h1 className="page-title">Замовлення прийнято</h1>
        <p className="muted">
          №{order.id.slice(0, 8).toUpperCase()} · {formatDate(order.created_at)}
        </p>
        <p className="muted small">
          Ми зв&apos;яжемось із вами для підтвердження. Збережіть номер замовлення.
        </p>
      </div>

      <div className="confirm-grid">
        <div className="card">
          <h3>Склад замовлення</h3>
          <ul className="confirm-items">
            {order.items.map((it) => (
              <li key={it.id}>
                <span className="ci-title">{it.title}</span>
                <span className="muted">×{it.quantity}</span>
                <span className="ci-sum">{formatPrice(it.price_cents * it.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="confirm-total">
            <span>Разом</span>
            <strong>{formatPrice(order.total_cents)}</strong>
          </div>
        </div>

        <div className="card">
          <h3>Деталі</h3>
          <dl className="confirm-meta">
            <div>
              <dt>Статус</dt>
              <dd>{orderStatusLabel(order.status)}</dd>
            </div>
            <div>
              <dt>Оплата</dt>
              <dd>
                {PAYMENT_LABELS[order.payment_method]} · {paymentStatusLabel(order.payment_status)}
              </dd>
            </div>
            <div>
              <dt>Доставка</dt>
              <dd>{DELIVERY_LABELS[order.delivery_method]}</dd>
            </div>
            {order.np_city_name && (
              <div>
                <dt>Місто</dt>
                <dd>{order.np_city_name}</dd>
              </div>
            )}
            {order.np_warehouse_name && (
              <div>
                <dt>Відділення</dt>
                <dd>{order.np_warehouse_name}</dd>
              </div>
            )}
            {order.recipient_name && (
              <div>
                <dt>Отримувач</dt>
                <dd>{order.recipient_name}</dd>
              </div>
            )}
            {order.ttn && (
              <div>
                <dt>ТТН</dt>
                <dd className="mono">{order.ttn}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <Link to="/" className="btn btn-primary btn-lg">
        Продовжити покупки
      </Link>
    </div>
  );
}
