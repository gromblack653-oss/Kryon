import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crmApi } from '../api/endpoints';
import { Avatar } from '../components/Avatar';
import { CallButton } from '../components/CallButton';
import { CallRecording } from '../components/CallRecording';
import { OrderRow } from '../components/OrderRow';
import {
  formatPrice,
  formatDate,
  formatDateShort,
  CALL_OUTCOME_LABELS,
  NOTE_TYPE_LABELS,
  NOTE_TYPE_ICONS,
} from '../lib/format';
import type { NoteType } from '../types';

type TimelineItem =
  | {
      kind: 'call';
      id: string;
      at: string;
      icon: string;
      title: string;
      outcome: string;
      text: string;
      agent?: string | null;
      recordingUrl: string | null;
    }
  | {
      kind: 'note';
      id: string;
      at: string;
      icon: string;
      title: string;
      text: string;
      agent?: string | null;
    };

const NOTE_TYPES: NoteType[] = ['note', 'task', 'meeting', 'email'];

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [noteType, setNoteType] = useState<NoteType>('note');
  const [noteBody, setNoteBody] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => crmApi.customer(id!),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['customer', id] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
  };

  const addNote = useMutation({
    mutationFn: () => crmApi.addNote(id!, { type: noteType, body: noteBody }),
    onSuccess: () => {
      setNoteBody('');
      invalidate();
    },
  });

  if (isLoading) return <p className="muted">Завантаження...</p>;
  if (isError || !data) return <p className="error">Клієнта не знайдено.</p>;

  const { customer, orders, calls, notes } = data;

  const timeline: TimelineItem[] = [
    ...calls.map((c): TimelineItem => ({
      kind: 'call',
      id: c.id,
      at: c.created_at,
      icon: c.direction === 'outbound' ? '📤' : '📥',
      title: c.direction === 'outbound' ? 'Вихідний дзвінок' : 'Вхідний дзвінок',
      outcome: c.outcome,
      text: c.note,
      agent: c.agent_name,
      recordingUrl: c.recording_url,
    })),
    ...notes.map((n): TimelineItem => ({
      kind: 'note',
      id: n.id,
      at: n.created_at,
      icon: NOTE_TYPE_ICONS[n.type],
      title: NOTE_TYPE_LABELS[n.type],
      text: n.body,
      agent: n.agent_name,
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <div>
      <Link to="/customers" className="back-link">
        ← Усі клієнти
      </Link>

      <div className="grid-detail">
        {/* --- Profile --- */}
        <div className="card profile">
          <Avatar name={customer.name} size={72} />
          <h2>{customer.name}</h2>
          <p className="muted">Клієнт із {formatDateShort(customer.created_at)}</p>

          <div style={{ margin: '1rem 0' }}>
            <CallButton
              phone={customer.phone}
              customerId={customer.id}
              customerName={customer.name}
              onLogged={invalidate}
            />
          </div>

          <div className="contact">
            <div className="contact-row">
              <span className="ci">✉️</span>
              {customer.email}
            </div>
            <div className="contact-row">
              <span className="ci">📱</span>
              <span className="mono">{customer.phone ?? 'номер не вказано'}</span>
            </div>
          </div>

          <div className="profile-stats">
            <div className="ps">
              <div className="ps-val">{customer.orders_count}</div>
              <div className="ps-lbl">замовлень</div>
            </div>
            <div className="ps">
              <div className="ps-val">{formatPrice(customer.total_spent_cents)}</div>
              <div className="ps-lbl">витрачено</div>
            </div>
            <div className="ps">
              <div className="ps-val">{customer.calls_count}</div>
              <div className="ps-lbl">дзвінків</div>
            </div>
            <div className="ps">
              <div className="ps-val">{orders.length}</div>
              <div className="ps-lbl">в історії</div>
            </div>
          </div>
        </div>

        {/* --- Right column --- */}
        <div className="stack">
          {/* Shared orders */}
          <div className="card">
            <div className="card-title">
              🛒 Замовлення{' '}
              <span className="muted" style={{ fontWeight: 400 }}>
                (спільні з магазином · натисніть для товарів)
              </span>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Замовлення</th>
                    <th>Статус</th>
                    <th>Сума</th>
                    <th>Дата</th>
                    <th>Накладна</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <OrderRow key={o.id} order={o} />
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty">
                        Замовлень ще немає.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activity + composer */}
          <div className="card">
            <div className="card-title">🕑 Активність</div>

            <div className="composer">
              <div className="seg">
                {NOTE_TYPES.map((t) => (
                  <button key={t} className={noteType === t ? 'active' : ''} onClick={() => setNoteType(t)}>
                    {NOTE_TYPE_ICONS[t]} {NOTE_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
              <textarea
                rows={2}
                placeholder="Додати нотатку, задачу чи підсумок..."
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={!noteBody.trim() || addNote.isPending}
                  onClick={() => addNote.mutate()}
                >
                  {addNote.isPending ? 'Додаємо...' : 'Додати'}
                </button>
              </div>
            </div>

            <div className="timeline">
              {timeline.map((t) => (
                <div key={`${t.kind}-${t.id}`} className="tl-item">
                  <div className="tl-dot">{t.icon}</div>
                  <div className="tl-body">
                    <div className="tl-head">
                      <strong>{t.title}</strong>
                      <span className="tl-meta">{formatDate(t.at)}</span>
                    </div>
                    {t.kind === 'call' && (
                      <div style={{ margin: '0.25rem 0' }}>
                        <span className={`pill pill-${t.outcome}`}>{CALL_OUTCOME_LABELS[t.outcome]}</span>
                      </div>
                    )}
                    {t.text && <div className="tl-text">{t.text}</div>}
                    {t.kind === 'call' && (
                      <div className="tl-rec">
                        <CallRecording callId={t.id} recordingUrl={t.recordingUrl} onUploaded={invalidate} />
                      </div>
                    )}
                    {t.agent && <div className="tl-meta">— {t.agent}</div>}
                  </div>
                </div>
              ))}
              {timeline.length === 0 && (
                <div className="empty">Активності ще немає. Подзвоніть або додайте нотатку.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
