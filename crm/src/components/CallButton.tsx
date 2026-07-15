import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { telephonyApi } from '../api/endpoints';
import { useSettingsStore } from '../store/settingsStore';
import { initiateCall } from '../lib/sip';
import { CallPanel } from './CallPanel';
import type { CallLog } from '../types';

interface Props {
  phone: string | null;
  customerId?: string;
  customerName?: string;
  label?: string;
  compact?: boolean;
  onLogged?: () => void;
}

/**
 * Click-to-call: піднімає MicroSIP через sip:-URI і одночасно стартує дзвінок
 * на сервері. Далі результат і тривалість проставляє АТС своїми подіями —
 * оператор нічого не вводить, крім нотатки.
 */
export function CallButton({ phone, customerId, customerName, label = 'Подзвонити', compact, onLogged }: Props) {
  const protocol = useSettingsStore((s) => s.protocol);
  const [call, setCall] = useState<CallLog | null>(null);

  const start = useMutation({
    mutationFn: () => telephonyApi.start(phone!, customerId ?? null),
    onSuccess: (created) => {
      setCall(created);
      initiateCall(phone!, protocol); // піднімаємо softphone
    },
  });

  if (!phone) {
    return <span className="muted" title="Немає номера">☎ немає номера</span>;
  }

  return (
    <>
      <button
        className={`btn btn-call ${compact ? 'btn-sm' : ''}`}
        disabled={start.isPending}
        onClick={() => start.mutate()}
      >
        <span className="call-icon">📞</span>
        {!compact && (start.isPending ? 'Дзвонимо...' : label)}
      </button>

      {call && (
        <CallPanel
          call={call}
          customerName={customerName}
          onDone={() => {
            setCall(null);
            onLogged?.();
          }}
        />
      )}
    </>
  );
}
