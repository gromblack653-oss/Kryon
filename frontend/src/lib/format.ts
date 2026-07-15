/** Форматує ціну з копійок/центів у гривні. */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Очікує оплати',
  paid: 'Оплачено',
  shipped: 'Відправлено',
  delivered: 'Доставлено',
  cancelled: 'Скасовано',
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Підпис статусу з урахуванням способу оплати.
 * Накладений платіж оплачують при отриманні, тож таке замовлення не «очікує
 * оплати» — воно вже прийняте в роботу.
 */
export function orderStatusLabel(status: string, paymentMethod?: string): string {
  if (status === "pending" && paymentMethod === "cod") return "Прийнято";
  return ORDER_STATUS_LABELS[status] ?? status;
}

/** Підпис стану оплати: для накладеного платежу «не оплачено» = «при отриманні». */
export function paymentStatusLabel(paymentStatus: string, paymentMethod?: string): string {
  if (paymentMethod === "cod" && (paymentStatus === "unpaid" || paymentStatus === "pending")) {
    return "при отриманні";
  }
  const labels: Record<string, string> = {
    unpaid: "не оплачено",
    pending: "очікує оплати",
    paid: "оплачено",
    failed: "оплата не пройшла",
    refunded: "повернено",
  };
  return labels[paymentStatus] ?? paymentStatus;
}
