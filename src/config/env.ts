import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().url().default('postgresql://postgres:postgres@localhost:5432/paypal_invoice_chat'),

  // Application Secrets
  SESSION_SECRET: z.string().min(16).default('development-session-secret-must-be-changed-in-prod'),
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),

  // Anthropic LLM
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  MODEL: z.string().default('claude-3-7-sonnet-20250219'),

  // PayPal Invoicing v2
  PAYPAL_CLIENT_ID: z.string().optional().default(''),
  PAYPAL_SECRET: z.string().optional().default(''),
  PAYPAL_BASE: z.string().url().default('https://api-m.sandbox.paypal.com'),
  PAYPAL_WEBHOOK_ID: z.string().optional().default(''),

  // Email provider (optional in mock mode)
  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('invoices@example.com'),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const missing = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n');
    console.error('❌ FATAL: Invalid application environment configuration:\n' + missing);
  } else {
    console.error('❌ FATAL: Unknown environment parsing error', error);
  }
  process.exit(1);
}

export const env = parsedEnv;

