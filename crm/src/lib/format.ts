export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateShort(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** 245 → "4 хв 05 с" */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} хв ${String(s).padStart(2, '0')} с` : `${s} с`;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Очікує оплати',
  paid: 'Оплачено',
  shipped: 'Відправлено',
  delivered: 'Доставлено',
  cancelled: 'Скасовано',
};

export const CALL_OUTCOME_LABELS: Record<string, string> = {
  answered: 'Відповіли',
  no_answer: 'Не відповіли',
  busy: 'Зайнято',
  voicemail: 'Голосова пошта',
  failed: 'Помилка',
};

export const NOTE_TYPE_LABELS: Record<string, string> = {
  note: 'Нотатка',
  task: 'Задача',
  meeting: 'Зустріч',
  email: 'Email',
};

export const NOTE_TYPE_ICONS: Record<string, string> = {
  note: '📝',
  task: '✅',
  meeting: '📅',
  email: '✉️',
};

/** Детермінований колір аватара за рядком (ім'ям). */
export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 55%)`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Підпис статусу з урахуванням способу оплати.
 * Накладений платіж оплачують при отриманні, тож таке замовлення не «очікує
 * оплати» — воно вже прийняте в роботу.
 */
export function orderStatusLabel(status: string, paymentMethod?: string): string {
  if (status === 'pending' && paymentMethod === 'cod') return 'Прийнято';
  return ORDER_STATUS_LABELS[status] ?? status;
}

/** Підпис стану оплати: для накладеного платежу «не оплачено» = «при отриманні». */
export function paymentStatusLabel(paymentStatus: string, paymentMethod?: string): string {
  if (paymentMethod === 'cod' && (paymentStatus === 'unpaid' || paymentStatus === 'pending')) {
    return 'при отриманні';
  }
  const labels: Record<string, string> = {
    unpaid: 'не оплачено',
    pending: 'очікує оплати',
    paid: 'оплачено',
    failed: 'оплата не пройшла',
    refunded: 'повернено',
  };
  return labels[paymentStatus] ?? paymentStatus;
}
