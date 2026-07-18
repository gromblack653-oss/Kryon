import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { crmApi } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { CALL_OUTCOME_LABELS, formatDate, formatDuration, formatPrice } from '@shopcore/shared';
import { Avatar } from '../components/Avatar';
import { CallButton } from '../components/CallButton';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: crmApi.stats });
  const { data: calls } = useQuery({ queryKey: ['calls'], queryFn: () => crmApi.recentCalls() });

  const outcomes = ['answered', 'no_answer', 'busy', 'voicemail', 'failed'] as const;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Вітаємо, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-sub">Огляд роботи кол-центру на сьогодні</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat violet">
          <div className="stat-ico">👥</div>
          <div className="stat-val">{stats?.customers ?? '—'}</div>
          <div className="stat-lbl">Клієнтів у базі</div>
        </div>
        <div className="stat green">
          <div className="stat-ico">📞</div>
          <div className="stat-val">{stats?.myCallsToday ?? '—'}</div>
          <div className="stat-lbl">Моїх дзвінків сьогодні</div>
        </div>
        <div className="stat blue">
          <div className="stat-ico">☎</div>
          <div className="stat-val">{stats?.callsToday ?? '—'}</div>
          <div className="stat-lbl">Усього дзвінків сьогодні</div>
        </div>
        <div className="stat amber">
          <div className="stat-ico">✅</div>
          <div className="stat-val">{stats?.callsByOutcome.answered ?? 0}</div>
          <div className="stat-lbl">Успішних розмов</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">📞 Останні дзвінки</div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Клієнт</th>
                  <th>Номер</th>
                  <th>Результат</th>
                  <th>Трив.</th>
                  <th>Коли</th>
                </tr>
              </thead>
              <tbody>
                {calls?.slice(0, 8).map((c) => (
                  <tr key={c.id}>
                    <td>
                      {c.customer_id ? (
                        <Link to={`/customers/${c.customer_id}`} className="cust-cell">
                          <Avatar name={c.customer_name ?? '?'} size={28} />
                          <span>{c.customer_name ?? '—'}</span>
                        </Link>
                      ) : (
                        <span className="muted">— невідомий —</span>
                      )}
                    </td>
                    <td className="mono">{c.phone}</td>
                    <td>
                      <span className={`pill pill-${c.outcome}`}>{CALL_OUTCOME_LABELS[c.outcome]}</span>
                    </td>
                    <td className="muted">{formatDuration(c.duration_seconds)}</td>
                    <td className="muted">{formatDate(c.created_at)}</td>
                  </tr>
                ))}
                {calls && calls.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty">
                      Дзвінків ще немає.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-title">📊 Дзвінки за результатом</div>
          <table className="table">
            <tbody>
              {outcomes.map((o) => (
                <tr key={o}>
                  <td>
                    <span className={`pill pill-${o}`}>{CALL_OUTCOME_LABELS[o]}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{stats?.callsByOutcome[o] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {}
          <div className="card-title" style={{ marginTop: 22 }}>
            🎯 Черга на обдзвін
          </div>
          {!stats?.needsCall.length ? (
            <p className="muted">
              Черга порожня — усім клієнтам з активними замовленнями вже дзвонили сьогодні.
            </p>
          ) : (
            <table className="table">
              <tbody>
                {stats.needsCall.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/customers/${c.id}`} className="cust-name">
                        {c.name}
                      </Link>
                      <div className="muted small">
                        {c.orders_count} активн. замовл. · {formatPrice(c.total_spent_cents)}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <CallButton phone={c.phone} customerId={c.id} customerName={c.name} compact />
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
