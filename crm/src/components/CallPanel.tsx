import { useCallback, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { telephonyApi } from '../api/endpoints';
import { useCallSocket } from '../hooks/useCallSocket';
import { CALL_OUTCOME_LABELS } from '../lib/format';
import type { CallLog } from '../types';

interface Props {
  call: CallLog;
  customerName?: string;
  onDone: () => void;
}

/** Секунди у вигляді 01:23. */
function fmt(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Панель активного дзвінка.
 * Напрямок, результат і тривалість приходять від АТС — оператор їх не вводить.
 * Вручну лишається тільки нотатка.
 */
export function CallPanel({ call: initial, customerName, onDone }: Props) {
  const [call, setCall] = useState<CallLog>(initial);
  const [note, setNote] = useState(initial.note ?? '');
  const [elapsed, setElapsed] = useState(0);

  // Оновлення від АТС стосуються саме цього дзвінка.
  const onUpdate = useCallback(
    (incoming: CallLog) => {
      if (incoming.id === initial.id) setCall(incoming);
    },
    [initial.id],
  );
  useCallSocket(onUpdate);

  // Лічильник розмови: рахуємо від моменту відповіді, який зафіксував сервер.
  useEffect(() => {
    if (call.state !== 'active' || !call.answered_at) return;
    const from = new Date(call.answered_at).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - from) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [call.state, call.answered_at]);

  const hangup = useMutation({
    mutationFn: (event: 'completed' | 'no_answer' | 'busy') => telephonyApi.hangup(call.id, event),
    onSuccess: (updated) => setCall(updated),
  });

  const saveNote = useMutation({
    mutationFn: () => telephonyApi.saveNote(call.id, note),
    onSuccess: onDone,
  });

  const done = call.state === 'completed';

  return (
    <div className="modal-backdrop">
      <div className="modal call-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>{done ? 'Дзвінок завершено' : 'Дзвінок'}</h3>
            <span className="muted">
              {customerName ? `${customerName} · ` : ''}
              {call.phone}
            </span>
          </div>
        </div>

        {/* --- Стан дзвінка: усе з АТС --- */}
        <div className={`call-state ${call.state}`}>
          {call.state === 'ringing' && (
            <>
              <span className="pulse" />
              <span className="call-state-text">Набираємо номер…</span>
              <span className="muted small">Очікуємо відповіді</span>
            </>
          )}
          {call.state === 'active' && (
            <>
              <span className="pulse live" />
              <span className="call-timer">{fmt(elapsed)}</span>
              <span className="muted small">Розмова триває</span>
            </>
          )}
          {done && (
            <>
              <span className={`outcome-badge ${call.outcome}`}>{CALL_OUTCOME_LABELS[call.outcome]}</span>
              <span className="call-timer">{fmt(call.duration_seconds)}</span>
              <span className="muted small">
                {call.direction === 'outbound' ? '↗ Вихідний' : '↙ Вхідний'} · тривалість зафіксована АТС
              </span>
            </>
          )}
        </div>

        {/* --- Кнопки завершення (з реальною АТС приходять вебхуком) --- */}
        {!done && (
          <div className="call-actions">
            {call.state === 'active' ? (
              <button
                className="btn btn-danger full"
                disabled={hangup.isPending}
                onClick={() => hangup.mutate('completed')}
              >
                ✕ Завершити розмову
              </button>
            ) : (
              <>
                <button
                  className="btn btn-ghost"
                  disabled={hangup.isPending}
                  onClick={() => hangup.mutate('no_answer')}
                >
                  Не відповідає
                </button>
                <button
                  className="btn btn-ghost"
                  disabled={hangup.isPending}
                  onClick={() => hangup.mutate('busy')}
                >
                  Зайнято
                </button>
              </>
            )}
          </div>
        )}

        {/* --- Єдине, що вводить оператор --- */}
        <label>
          Нотатка
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Про що говорили..."
          />
        </label>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onDone}>
            {done ? 'Закрити' : 'Згорнути'}
          </button>
          <button
            className="btn btn-primary"
            disabled={!done || saveNote.isPending}
            onClick={() => saveNote.mutate()}
          >
            {saveNote.isPending ? 'Збереження...' : 'Зберегти нотатку'}
          </button>
        </div>
      </div>
    </div>
  );
}
