import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { crmApi } from '../api/endpoints';
import { CallButton } from '../components/CallButton';
import { CallRecording } from '../components/CallRecording';
import { Avatar } from '../components/Avatar';
import { CALL_OUTCOME_LABELS, formatDate, formatDuration } from '../lib/format';
import type { CallSort } from '../types';

const SORTS: Array<{ value: CallSort; label: string }> = [
  { value: 'newest', label: 'Спочатку нові' },
  { value: 'oldest', label: 'Спочатку старі' },
  { value: 'outcome', label: 'За статусом' },
  { value: 'duration', label: 'За тривалістю' },
];

export function CallsPage() {
  const queryClient = useQueryClient();
  const [number, setNumber] = useState('');
  const [sort, setSort] = useState<CallSort>('newest');
  const { data: calls } = useQuery({ queryKey: ['calls', sort], queryFn: () => crmApi.recentCalls(sort) });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['calls'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Дзвінки</h1>
          <p className="page-sub">Журнал дзвінків, прослуховування та швидкий набір через MicroSIP</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-title">⚡ Швидкий набір</div>
        <div className="row-between" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <input
            style={{ maxWidth: 280 }}
            placeholder="+380..."
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
          <CallButton
            phone={number || null}
            onLogged={() => {
              refresh();
              setNumber('');
            }}
          />
        </div>
        <p className="muted" style={{ marginTop: '0.75rem', fontSize: '0.82rem' }}>
          Натисніть «Подзвонити» — відкриється MicroSIP (протокол sip:), а після — форма запису результату.
        </p>
      </div>

      <div className="toolbar">
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            Сортування:
          </span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as CallSort)}
            style={{ width: 'auto' }}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Клієнт</th>
                <th>Номер</th>
                <th>Напрям</th>
                <th>Результат</th>
                <th>Трив.</th>
                <th>Запис</th>
                <th>Оператор</th>
                <th>Коли</th>
              </tr>
            </thead>
            <tbody>
              {calls?.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.customer_id ? (
                      <Link to={`/customers/${c.customer_id}`} className="cust-cell">
                        <Avatar name={c.customer_name ?? '?'} size={28} />
                        <span>{c.customer_name}</span>
                      </Link>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="mono">{c.phone}</td>
                  <td>
                    <span className={`dir ${c.direction === 'outbound' ? 'out' : 'in'}`}>
                      {c.direction === 'outbound' ? '↗ вих.' : '↙ вх.'}
                    </span>
                  </td>
                  <td>
                    <span className={`pill pill-${c.outcome}`}>{CALL_OUTCOME_LABELS[c.outcome]}</span>
                  </td>
                  <td className="muted">{formatDuration(c.duration_seconds)}</td>
                  <td>
                    <CallRecording callId={c.id} recordingUrl={c.recording_url} onUploaded={refresh} />
                  </td>
                  <td className="muted">{c.agent_name ?? '—'}</td>
                  <td className="muted">{formatDate(c.created_at)}</td>
                </tr>
              ))}
              {calls && calls.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty">
                    Дзвінків ще немає.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
