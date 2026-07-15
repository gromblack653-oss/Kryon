import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { statsApi } from '../api/endpoints';
import { formatPrice, formatDate, ORDER_STATUS_LABELS, orderStatusLabel } from '../lib/format';

export function DashboardPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['stats'], queryFn: statsApi.get });

  if (isLoading) return <p className="muted">Завантаження...</p>;
  if (isError || !data) return <p className="error">Не вдалося завантажити статистику.</p>;

  const statusOrder = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'] as const;

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Дашборд</h1>
      </div>

      <div className="stat-grid">
        <div className="card stat-tile">
          <span className="stat-label">Дохід (оплачені+)</span>
          <span className="stat-value success">{formatPrice(data.revenueCents)}</span>
          <span className="stat-sub">{data.paidOrders} замовлень</span>
        </div>
        <div className="card stat-tile">
          <span className="stat-label">Товарів у каталозі</span>
          <span className="stat-value accent">{data.products.total}</span>
          <span className="stat-sub">{data.products.active} активних</span>
        </div>
        <div className="card stat-tile">
          <span className="stat-label">Покупців</span>
          <span className="stat-value">{data.customers}</span>
        </div>
        <div className="card stat-tile">
          <span className="stat-label">Немає на складі</span>
          <span className="stat-value danger">{data.products.out_of_stock}</span>
          <span className="stat-sub">{data.products.low_stock} закінчуються</span>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <h3>Останні замовлення</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Замовлення</th>
                  <th>Покупець</th>
                  <th>Статус</th>
                  <th>Сума</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link to={`/orders/${o.id}`} className="mono">
                        #{o.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td>{o.customer_name}</td>
                    <td>
                      <span className={`pill pill-${o.status}`}>{orderStatusLabel(o.status, o.payment_method)}</span>
                    </td>
                    <td>{formatPrice(o.total_cents)}</td>
                    <td className="muted">{formatDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3>Замовлення за статусами</h3>
          <table className="table">
            <tbody>
              {statusOrder.map((s) => (
                <tr key={s}>
                  <td>
                    <span className={`pill pill-${s}`}>{ORDER_STATUS_LABELS[s]}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{data.ordersByStatus[s] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ marginTop: '1.5rem' }}>Топ продажів</h3>
          <table className="table">
            <tbody>
              {data.topProducts.map((p) => (
                <tr key={p.id}>
                  <td>{p.title}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{p.sold} шт.</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dash-grid" style={{ marginTop: 16 }}>
        <RevenueChart data={data.revenueByDay} />

        <div className="card">
          <h3>Закінчуються на складі</h3>
          {data.lowStock.length === 0 ? (
            <p className="muted">Усе гаразд — критичних залишків немає.</p>
          ) : (
            <table className="table">
              <tbody>
                {data.lowStock.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/products/${p.id}`}>{p.title}</Link>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`pill ${p.stock === 0 ? 'pill-cancelled' : 'pill-pending'}`}>
                        {p.stock === 0 ? 'немає' : `${p.stock} шт.`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/** Дохід за тиждень. Стовпчики рахуємо від максимуму — без сторонніх бібліотек. */
function RevenueChart({ data }: { data: Array<{ day: string; cents: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.cents));
  const total = data.reduce((s, d) => s + d.cents, 0);

  return (
    <div className="card">
      <div className="chart-head">
        <h3>Дохід за 7 днів</h3>
        <strong className="stat-value accent" style={{ fontSize: 20 }}>{formatPrice(total)}</strong>
      </div>
      <div className="chart">
        {data.map((d) => (
          <div key={d.day} className="chart-col" title={`${d.day}: ${formatPrice(d.cents)}`}>
            <div className="chart-bar-wrap">
              {/* Мінімум 2% — щоб порожній день лишався видимим слідом, а не зникав. */}
              <div className="chart-bar" style={{ height: `${Math.max(2, (d.cents / max) * 100)}%` }} />
            </div>
            <span className="chart-x">{d.day.slice(8)}.{d.day.slice(5, 7)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
