const base = import.meta.env.VITE_API_URL || '';

/**
 * Абсолютний URL зображення товару.
 * - Зовнішні (http…) повертаємо як є.
 * - Локальні (/uploads/…) префіксимо базою API: у dev вона порожня (працює
 *   Vite-проксі), у продакшені — origin бекенду з VITE_API_URL.
 */
export function assetUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${base}${url}`;
}
