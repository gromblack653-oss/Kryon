import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../api/endpoints';
import { downloadFile } from '../lib/download';
import { formatPrice, formatDate, orderStatusLabel, paymentStatusLabel } from '@shopcore/shared';
import { apiError } from '../api/client';
import type { OrderStatus, PaymentMethod, DeliveryMethod } from '../types';

const NEXT: Record<OrderStatus, OrderStatus[]> = {
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

/** Накладений платіж можна відправляти одразу — гроші беруть при врученні. */
function nextStatuses(status: OrderStatus, paymentMethod: PaymentMethod): OrderStatus[] {
  const base = NEXT[status];
  return paymentMethod === 'cod' && status === 'pending' ? [...base, 'shipped'] : base;
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [downloading, setDownloading] = useState(false);

  async function invoice() {
    setDownloading(true);
    try {
      await downloadFile(`/api/orders/${id}/invoice`, `nakladna-${id!.slice(0, 8)}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

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
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  if (isLoading) return <p className="muted">Завантаження...</p>;
  if (isError || !order) return <p className="error">Замовлення не знайдено.</p>;

  return (
    <div>
      <Link to="/orders" className="back-link">
        ← До замовлень
      </Link>
      <div className="page-head">
        <h1 className="page-title">Замовлення #{order.id.slice(0, 8)}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className={`pill pill-${order.status}`}>
            {orderStatusLabel(order.status, order.payment_method)}
          </span>
          <button className="btn btn-primary" disabled={downloading} onClick={invoice}>
            {downloading ? 'Формуємо...' : '📄 Накладна PDF'}
          </button>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <h3>Позиції</h3>
          <table className="table">
            <tbody>
              {order.items.map((i) => (
                <tr key={i.id}>
                  <td>{i.title}</td>
                  <td className="muted">× {i.quantity}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {formatPrice(i.price_cents * i.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="summary-row" style={{ marginTop: '0.5rem', borderBottom: 'none' }}>
            <strong>Разом</strong>
            <strong className="stat-value accent" style={{ fontSize: '1.2rem' }}>
              {formatPrice(order.total_cents)}
            </strong>
          </div>
        </div>

        <div className="card">
          <h3>Доставка та оплата</h3>
          <div className="summary-row">
            <span className="muted">Створено</span>
            <span>{formatDate(order.created_at)}</span>
          </div>
          <div className="summary-row">
            <span className="muted">Доставка</span>
            <span>{DELIVERY_LABELS[order.delivery_method]}</span>
          </div>
          <div className="summary-row">
            <span className="muted">Адреса</span>
            <span style={{ textAlign: 'right' }}>{order.shipping_address}</span>
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
              <span className="muted">Накладна НП</span>
              <span className="mono">{order.ttn}</span>
            </div>
          )}
          <div className="summary-row">
            <span className="muted">Оплата</span>
            <span>
              {PAYMENT_LABELS[order.payment_method]}{' '}
              <span className={`pill pill-${order.payment_status === 'paid' ? 'delivered' : 'pending'}`}>
                {paymentStatusLabel(order.payment_status, order.payment_method)}
              </span>
            </span>
          </div>

          {nextStatuses(order.status, order.payment_method).length > 0 ? (
            <>
              <h3 style={{ marginTop: '1.5rem' }}>Змінити статус</h3>
              <div className="btn-row">
                {nextStatuses(order.status, order.payment_method).map((s) => (
                  <button
                    key={s}
                    className="btn btn-primary btn-sm"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate(s)}
                  >
                    → {orderStatusLabel(s, order.payment_method)}
                  </button>
                ))}
              </div>
              {updateStatus.isError && <p className="error">{apiError(updateStatus.error)}</p>}
            </>
          ) : (
            <p className="muted" style={{ marginTop: '1rem' }}>
              Статус фінальний — змін немає.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
