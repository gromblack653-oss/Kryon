import { api } from '../api/client';

/** Завантажує файл із захищеного ендпоінта (токен додає axios-інтерсептор). */
export async function downloadFile(url: string, filename: string): Promise<void> {
  const res = await api.get(url, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(res.data as Blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}
