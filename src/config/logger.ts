import pino from 'pino';
import { env } from './env.js';

const redactedKeys = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'req.headers["paypal-auth-assertion"]',
  '*.password',
  '*.secret',
  '*.token',
  '*.apiKey',
  '*.api_key',
  '*.accessToken',
  '*.access_token',
  '*.clientSecret',
  '*.client_secret',
  '*.email', // Redact PII in compliance with Phase 10 / LLM guidelines
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: redactedKeys,
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

export const childLogger = (moduleName: string) => logger.child({ module: moduleName });
