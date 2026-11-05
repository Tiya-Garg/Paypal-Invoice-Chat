import http from 'node:http';
import { createApp } from './http/app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { pool } from './db/pool.js';
import { runMigrations } from './db/migrate.js';

async function bootstrap() {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Starting PayPal Invoice Chat application...');

  try {
    await runMigrations();
  } catch (err) {
    logger.warn({ err }, 'Could not run migrations automatically at boot; continuing in offline/test mode');
  }

  const app = createApp();
  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    logger.info(`Server listening on http://localhost:${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Graceful shutdown initiated');
    server.close(async () => {
      logger.info('HTTP server closed');
      try {
        await pool.end();
        logger.info('Database pool closed');
      } catch (err) {
        logger.error({ err }, 'Error closing database pool');
      }
      process.exit(0);
    });

    setTimeout(() => {
      logger.fatal('Forceful shutdown due to timeout');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch(err => {
  logger.fatal({ err }, 'Fatal startup error');
  process.exit(1);
});
