import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ordersApi } from '../api/endpoints';
import { downloadFile } from '../lib/download';
import { formatPrice, formatDate, orderStatusLabel } from '@shopcore/shared';

export function OrdersPage() {
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const { data } = useQuery({
    queryKey: ['orders', page],
    queryFn: () => ordersApi.list(page, 20),
    placeholderData: keepPreviousData,
  });

  const pages = data ? Math.ceil(data.total / data.limit) : 1;

  async function exportCsv() {
    setExporting(true);
    try {
      await downloadFile('/api/admin/orders/export', 'orders-export.csv');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Замовлення</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="muted">Усього: {data?.total ?? 0}</span>
          <button className="btn btn-primary" disabled={exporting} onClick={exportCsv}>
            {exporting ? 'Експорт...' : '⬇ Експорт CSV'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Замовлення</th>
                <th>Статус</th>
                <th>Сума</th>
                <th>Адреса</th>
                <th>Дата</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((o) => (
                <tr key={o.id}>
                  <td className="mono">#{o.id.slice(0, 8)}</td>
                  <td>
                    <span className={`pill pill-${o.status}`}>
                      {orderStatusLabel(o.status, o.payment_method)}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{formatPrice(o.total_cents)}</td>
                  <td
                    className="muted"
                    style={{
                      maxWidth: 240,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {o.shipping_address}
                  </td>
                  <td className="muted">{formatDate(o.created_at)}</td>
                  <td>
                    <Link to={`/orders/${o.id}`} className="btn btn-ghost btn-sm">
                      Деталі
                    </Link>
                  </td>
                </tr>
              ))}
              {data && data.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    Замовлень немає.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="pagination">
            <button
              className="btn btn-ghost btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Назад
            </button>
            <span className="muted">
              {page} / {pages}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Далі →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
