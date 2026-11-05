import pg from 'pg';
import { env } from '../config/env.js';
import { childLogger } from '../config/logger.js';

const log = childLogger('database');

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', err => {
  log.error({ err }, 'Unexpected error on idle database client');
});

export async function query<R extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<R>> {
  const start = Date.now();
  const res = await pool.query<R>(text, params);
  const duration = Date.now() - start;
  log.trace({ text, duration, rows: res.rowCount }, 'Executed database query');
  return res;
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const res = await pool.query('SELECT 1 as alive');
    return (res.rows[0]?.alive ?? 0) === 1;
  } catch (error) {
    log.error({ error }, 'Database health check failed');
    return false;
  }
}
