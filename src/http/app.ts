import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../config/logger.js';
import { checkDatabaseHealth } from '../db/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // Request ID & Structured Logging Middleware
  app.use(
    pinoHttp({
      logger,
      genReqId: req => (req.headers['x-request-id'] as string) || randomUUID(),
      customLogLevel: (_req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'ws:', 'wss:', 'https://api-m.sandbox.paypal.com'],
        },
      },
    }),
  );

  app.use(cors());
  app.use(cookieParser());

  // Capture raw body for webhook verification before json body parser
  app.use(
    express.json({
      verify: (req: Request & { rawBody?: Buffer }, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  // Health and Readiness checks
  app.get('/healthz', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  app.get('/readyz', async (_req: Request, res: Response) => {
    const dbOk = await checkDatabaseHealth();
    if (dbOk) {
      res.status(200).json({ status: 'ready', db: 'connected', timestamp: new Date().toISOString() });
    } else {
      res.status(503).json({ status: 'unavailable', db: 'disconnected' });
    }
  });

  // Serve static UI assets
  app.use(express.static(path.join(__dirname, '../../public')));

  return app;
}
