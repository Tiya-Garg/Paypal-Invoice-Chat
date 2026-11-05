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
  '*.email',
];

const options: pino.LoggerOptions = {
  level: env.LOG_LEVEL,
  redact: {
    paths: redactedKeys,
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

if (env.NODE_ENV === 'development') {
  options.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  };
}

export const logger = pino(options);

export const childLogger = (moduleName: string) => logger.child({ module: moduleName });
