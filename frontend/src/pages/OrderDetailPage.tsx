import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi, paymentsApi } from '../api/endpoints';
import { formatPrice, formatDate, orderStatusLabel, paymentStatusLabel } from '@shopcore/shared';
import { useAuthStore } from '../store/authStore';
import type { OrderStatus, DeliveryMethod, PaymentMethod } from '../types';

// Накладений платіж можна відправляти одразу — гроші беруть при врученні.
function nextStatuses(status: OrderStatus, paymentMethod: PaymentMethod): OrderStatus[] {
  const base = NEXT_STATUSES[status];
  return paymentMethod === 'cod' && status === 'pending' ? [...base, 'shipped'] : base;
}

const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const DELIVERY_LABELS: Record<DeliveryMethod, string> = {
  np_warehouse: 'Нова Пошта — відділення',
  np_courier: 'Нова Пошта — курʼєр',
  pickup: 'Самовивіз',
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  card: 'Картка онлайн',
  cod: 'Накладений платіж',
};

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const role = useAuthStore((s) => s.user?.role);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    data: order,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.get(id!),
    enabled: !!id,
  });

  const updateStatus = useMutation({
    mutationFn: (status: OrderStatus) => ordersApi.updateStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  // Повторна спроба оплати: створюємо нову сесію і ведемо на шлюз.
  const payNow = useMutation({
    mutationFn: () => paymentsApi.createSession(id!),
    onSuccess: (session) => navigate(session.redirectUrl),
  });

  if (isLoading) return <p className="muted">Завантаження...</p>;
  if (isError || !order) return <p className="error">Замовлення не знайдено.</p>;

  return (
    <div className="order-detail">
      <Link to="/orders" className="back-link">
        ← До замовлень
      </Link>
      <div className="order-header">
        <h1>Замовлення #{order.id.slice(0, 8)}</h1>
        <span className={`status-pill status-${order.status}`}>
          {orderStatusLabel(order.status, order.payment_method)}
        </span>
      </div>
      <p className="muted">Створено: {formatDate(order.created_at)}</p>

      <div className="card order-delivery">
        <div className="summary-row">
          <span className="muted">Доставка</span>
          <span>{DELIVERY_LABELS[order.delivery_method]}</span>
        </div>
        <div className="summary-row">
          <span className="muted">Адреса</span>
          <span>{order.shipping_address}</span>
        </div>
        {order.recipient_name && (
          <div className="summary-row">
            <span className="muted">Отримувач</span>
            <span>
              {order.recipient_name}
              {order.recipient_phone ? `, ${order.recipient_phone}` : ''}
            </span>
          </div>
        )}
        {order.ttn && (
          <div className="summary-row">
            <span className="muted">Номер накладної</span>
            <span className="ttn">{order.ttn}</span>
          </div>
        )}
        <div className="summary-row">
          <span className="muted">Оплата</span>
          <span>
            {PAYMENT_LABELS[order.payment_method]}{' '}
            <span className={`pay-pill ${order.payment_status}`}>
              {paymentStatusLabel(order.payment_status, order.payment_method)}
            </span>
          </span>
        </div>
      </div>

      {/* Незавершену онлайн-оплату можна доплатити з картки замовлення. */}
      {order.payment_method === 'card' &&
        (order.payment_status === 'unpaid' || order.payment_status === 'failed') && (
          <button className="btn btn-primary" disabled={payNow.isPending} onClick={() => payNow.mutate()}>
            {payNow.isPending ? 'Створюємо платіж...' : 'Сплатити зараз'}
          </button>
        )}

      <div className="card order-items">
        {order.items.map((i) => (
          <div key={i.id} className="summary-row">
            <span>
              {i.title} × {i.quantity}
            </span>
            <span>{formatPrice(i.price_cents * i.quantity)}</span>
          </div>
        ))}
        <div className="summary-total">
          <span>Разом</span>
          <strong>{formatPrice(order.total_cents)}</strong>
        </div>
      </div>

      {role === 'admin' && nextStatuses(order.status, order.payment_method).length > 0 && (
        <div className="admin-actions card">
          <h3>Змінити статус</h3>
          <div className="btn-row">
            {nextStatuses(order.status, order.payment_method).map((s) => (
              <button
                key={s}
                className="btn btn-primary"
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate(s)}
              >
                {orderStatusLabel(s, order.payment_method)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
