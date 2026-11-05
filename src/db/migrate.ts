import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';
import { childLogger } from '../config/logger.js';

const log = childLogger('migration');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  const client = await pool.connect();
  try {
    log.info('Running database migrations...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = (await fs.readdir(migrationsDir))
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const res = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
      if ((res.rowCount ?? 0) === 0) {
        log.info({ file }, 'Applying migration');
        const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        log.info({ file }, 'Migration applied successfully');
      }
    }
    log.info('Database migrations are up to date.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    log.error({ error }, 'Migration failed');
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

