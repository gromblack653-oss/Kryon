import { cached } from '../../db/redis';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { npCities, npWarehouses, type NpCity, type NpWarehouse } from './np.fixtures';

const API_URL = 'https://api.novaposhta.ua/v2.0/json/';
const CACHE_TTL = 60 * 60 * 24;

export const isLiveNp = (): boolean => Boolean(env.novaPoshta.apiKey);

interface NpResponse<T> {
  success: boolean;
  data: T[];
  errors: string[];
}

async function call<T>(modelName: string, calledMethod: string, methodProperties: object): Promise<T[]> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ apiKey: env.novaPoshta.apiKey, modelName, calledMethod, methodProperties }),
  });
  if (!res.ok) throw new Error(`Nova Poshta HTTP ${res.status}`);
  const json = (await res.json()) as NpResponse<T>;
  if (!json.success) throw new Error(`Nova Poshta: ${json.errors.join('; ')}`);
  return json.data;
}

const matches = (haystack: string, q: string): boolean =>
  haystack.toLowerCase().includes(q.trim().toLowerCase());

export async function searchCities(q: string): Promise<NpCity[]> {
  const key = `np:cities:${q.toLowerCase()}`;

  return cached(key, CACHE_TTL, async () => {
    if (!isLiveNp()) {
      const found = q ? npCities.filter((c) => matches(c.name, q)) : npCities;
      return found.slice(0, 20);
    }
    try {
      const raw = await call<{ Ref: string; Description: string; AreaDescription?: string }>(
        'Address',
        'searchSettlements',
        { CityName: q, Limit: 20 },
      );
      return raw.map((c) => ({ ref: c.Ref, name: c.Description, area: c.AreaDescription ?? '' }));
    } catch (err) {
      logger.warn('Nova Poshta недоступна, використовуємо локальний довідник', {
        error: err instanceof Error ? err.message : String(err),
      });
      return (q ? npCities.filter((c) => matches(c.name, q)) : npCities).slice(0, 20);
    }
  });
}

export async function listWarehouses(cityRef: string, q = ''): Promise<NpWarehouse[]> {
  const key = `np:wh:${cityRef}:${q.toLowerCase()}`;

  return cached(key, CACHE_TTL, async () => {
    const local = () =>
      npWarehouses
        .filter((w) => w.cityRef === cityRef)
        .filter((w) => !q || matches(w.name, q) || matches(w.address, q))
        .slice(0, 50);

    if (!isLiveNp()) return local();
    try {
      const raw = await call<{
        Ref: string;
        Number: string;
        Description: string;
        ShortAddress?: string;
        PlaceMaxWeightAllowed?: string;
      }>('Address', 'getWarehouses', { CityRef: cityRef, FindByString: q, Limit: 50 });

      return raw.map((w) => ({
        ref: w.Ref,
        cityRef,
        number: Number(w.Number),
        name: `Відділення №${w.Number}`,
        address: w.ShortAddress ?? w.Description,
        maxWeightKg: Number(w.PlaceMaxWeightAllowed ?? 30),
      }));
    } catch (err) {
      logger.warn('Nova Poshta недоступна, використовуємо локальний довідник', {
        error: err instanceof Error ? err.message : String(err),
      });
      return local();
    }
  });
}

export async function findCity(ref: string): Promise<NpCity | undefined> {
  if (!isLiveNp()) return npCities.find((c) => c.ref === ref);
  const all = await searchCities('');
  return all.find((c) => c.ref === ref);
}

export async function findWarehouse(cityRef: string, ref: string): Promise<NpWarehouse | undefined> {
  const list = await listWarehouses(cityRef);
  return list.find((w) => w.ref === ref);
}

export function generateTtn(orderId: string): string {
  const digits = orderId.replace(/\D/g, '').padEnd(12, '0').slice(0, 12);
  return `205${digits}`.slice(0, 14);
}

export type { NpCity, NpWarehouse };
