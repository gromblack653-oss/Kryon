const base = import.meta.env.VITE_API_URL || '';

export function assetUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${base}${url}`;
}
