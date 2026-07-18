import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { crmApi } from '../api/endpoints';
import { formatPrice, formatDateShort } from '../lib/format';
import { Avatar } from '../components/Avatar';
import { CallButton } from '../components/CallButton';

export function CustomersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState<string | undefined>();

  const { data } = useQuery({
    queryKey: ['customers', page, search],
    queryFn: () => crmApi.customers({ page, limit: 15, search }),
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Клієнти</h1>
          <p className="page-sub">{data?.total ?? 0} клієнтів · спільна база з магазином</p>
        </div>
      </div>

      <div className="toolbar">
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(input || undefined);
          }}
        >
          <input
            placeholder="Пошук за ім'ям, email або телефоном..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </form>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Клієнт</th>
                <th>Телефон</th>
                <th>Замовлень</th>
                <th>Витрачено</th>
                <th>Останнє</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/customers/${c.id}`} className="cust-cell">
                      <Avatar name={c.name} size={38} />
                      <div>
                        <div className="cust-name">{c.name}</div>
                        <div className="muted" style={{ fontSize: '0.8rem' }}>
                          {c.email}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="mono">{c.phone ?? '—'}</td>
                  <td>{c.orders_count}</td>
                  <td style={{ fontWeight: 600 }}>{formatPrice(c.total_spent_cents)}</td>
                  <td className="muted">{formatDateShort(c.last_order_at)}</td>
                  <td>
                    <CallButton
                      phone={c.phone}
                      customerId={c.id}
                      customerName={c.name}
                      compact
                      onLogged={() => {
                        queryClient.invalidateQueries({ queryKey: ['customers'] });
                        queryClient.invalidateQueries({ queryKey: ['stats'] });
                      }}
                    />
                  </td>
                </tr>
              ))}
              {data && data.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    Клієнтів не знайдено.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data && data.pages > 1 && (
        <div className="pagination">
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← Назад
          </button>
          <span className="muted">
            {data.page} / {data.pages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Далі →
          </button>
        </div>
      )}
    </div>
  );
}
