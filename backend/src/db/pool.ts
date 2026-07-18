import { Pool, PoolClient } from 'pg';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const needsSsl = /sslmode=require/.test(env.databaseUrl) || process.env.PGSSL === 'true';

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await pool.query(text, params as never[]);
  return result.rows as T[];
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
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
