import type { DialProtocol } from '../store/settingsStore';

export function sanitizeNumber(raw: string): string {
  const trimmed = raw.trim();
  const plus = trimmed.startsWith('+') ? '+' : '';
  return plus + trimmed.replace(/[^\d]/g, '');
}

export function buildCallUri(number: string, protocol: DialProtocol): string {
  return `${protocol}:${sanitizeNumber(number)}`;
}

export function initiateCall(number: string, protocol: DialProtocol): void {
  const uri = buildCallUri(number, protocol);
  const frame = document.createElement('iframe');
  frame.style.display = 'none';
  frame.src = uri;
  document.body.appendChild(frame);
  window.setTimeout(() => frame.remove(), 1500);
}
