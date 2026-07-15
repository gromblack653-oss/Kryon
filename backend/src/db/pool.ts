import { Pool, PoolClient } from 'pg';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Керовані бази (Render, Neon, Supabase) вимагають TLS. Вмикаємо його, коли
// в URL є sslmode=require або задано PGSSL=true. Локально (docker) — без SSL.
const needsSsl = /sslmode=require/.test(env.databaseUrl) || process.env.PGSSL === 'true';

export const pool = new Pool({
  connectionString: env.databaseUrl,
  // rejectUnauthorized:false — сертифікати цих провайдерів self-signed у ланцюжку.
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});

/** Зручний хелпер для одиночних запитів. */
export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await pool.query(text, params as never[]);
  return result.rows as T[];
}

/**
 * Виконує callback усередині транзакції.
 * BEGIN → callback → COMMIT (або ROLLBACK при помилці).
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
