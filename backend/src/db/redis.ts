import { createClient } from 'redis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const redis = createClient({
  url: env.redisUrl,
  socket: {
    reconnectStrategy: (retries) => Math.min(1000 + retries * 500, 10000),
  },
});

const ERROR_LOG_INTERVAL_MS = 30_000;
let lastErrorLogAt = 0;
let wasReady = false;

redis.on('error', (err) => {
  const now = Date.now();
  if (now - lastErrorLogAt >= ERROR_LOG_INTERVAL_MS) {
    lastErrorLogAt = now;
    logger.warn('Redis недоступний — працюємо без кешу, автоперепідключення триває', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

redis.on('ready', () => {
  if (!wasReady) logger.info('Redis connected');
  else logger.info('Redis reconnected');
  wasReady = true;
  lastErrorLogAt = 0;
});

export function connectRedis(): void {
  redis.connect().catch((err) => {
    logger.warn('Redis недоступний на старті — API працює без кешу до перепідключення', {
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

export async function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  if (!redis.isReady) return loader();
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;

    const value = await loader();
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
    return value;
  } catch {
    return loader();
  }
}

export async function invalidate(pattern: string): Promise<void> {
  if (!redis.isReady) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length) await redis.del(keys);
  } catch {}
}
