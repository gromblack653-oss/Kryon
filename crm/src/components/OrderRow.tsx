import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { crmApi } from '../api/endpoints';
import { downloadFile } from '../lib/download';
import { formatPrice, formatDate, orderStatusLabel } from '@shopcore/shared';
import type { CustomerOrder } from '../types';

export function OrderRow({ order }: { order: CustomerOrder }) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ['order-items', order.id],
    queryFn: () => crmApi.orderItems(order.id),
    enabled: open,
  });

  async function invoice() {
    setDownloading(true);
    try {
      await downloadFile(`/api/orders/${order.id}/invoice`, `nakladna-${order.id.slice(0, 8)}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <tr className="order-main" onClick={() => setOpen((o) => !o)} style={{ cursor: 'pointer' }}>
        <td>
          <span className="chevron">{open ? '▾' : '▸'}</span>{' '}
          <span className="mono">#{order.id.slice(0, 8)}</span>
        </td>
        <td>
          <span className={`pill pill-${order.status}`}>
            {orderStatusLabel(order.status, order.payment_method)}
          </span>
        </td>
        <td style={{ fontWeight: 600 }}>{formatPrice(order.total_cents)}</td>
        <td className="muted">{formatDate(order.created_at)}</td>
        <td onClick={(e) => e.stopPropagation()}>
          <button
            className="btn btn-ghost btn-sm"
            disabled={downloading}
            onClick={invoice}
            title="Завантажити накладну PDF"
          >
            {downloading ? '⏳' : '📄 Накладна'}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="order-items-row">
          <td colSpan={5}>
            {isLoading ? (
              <span className="muted">Завантаження товарів...</span>
            ) : (
              <table className="table sub-table">
                <thead>
                  <tr>
                    <th>Товар</th>
                    <th>К-сть</th>
                    <th>Ціна</th>
                    <th>Сума</th>
                  </tr>
                </thead>
                <tbody>
                  {items?.map((it) => (
                    <tr key={it.id}>
                      <td>{it.title}</td>
                      <td>{it.quantity}</td>
                      <td>{formatPrice(it.price_cents)}</td>
                      <td style={{ fontWeight: 600 }}>{formatPrice(it.price_cents * it.quantity)}</td>
                    </tr>
                  ))}
                  {items && items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="muted">
                        Позицій немає.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
