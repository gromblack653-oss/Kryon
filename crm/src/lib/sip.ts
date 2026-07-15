import type { DialProtocol } from '../store/settingsStore';

/** Лишає лише цифри та провідний +, прибираючи пробіли/дужки/дефіси. */
export function sanitizeNumber(raw: string): string {
  const trimmed = raw.trim();
  const plus = trimmed.startsWith('+') ? '+' : '';
  return plus + trimmed.replace(/[^\d]/g, '');
}

/** Будує URI для дзвінка, напр. sip:+380671234567 (MicroSIP підхопить його). */
export function buildCallUri(number: string, protocol: DialProtocol): string {
  return `${protocol}:${sanitizeNumber(number)}`;
}

/**
 * Ініціює дзвінок через зовнішній застосунок (MicroSIP тощо).
 * Відкриває protocol-URI — ОС передає його зареєстрованому softphone.
 */
export function initiateCall(number: string, protocol: DialProtocol): void {
  const uri = buildCallUri(number, protocol);
  // Прихований iframe надійніше за location для custom-протоколів (не «ламає» SPA).
  const frame = document.createElement('iframe');
  frame.style.display = 'none';
  frame.src = uri;
  document.body.appendChild(frame);
  window.setTimeout(() => frame.remove(), 1500);
}
