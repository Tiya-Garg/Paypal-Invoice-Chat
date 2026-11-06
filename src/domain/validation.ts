import { z } from 'zod';

export const invoiceInputSchema = z.object({
  currency: z.enum(['USD', 'INR', 'EUR', 'GBP', 'CAD', 'AUD']).default('USD'),
  firmName: z.string().max(120).default(''),
  firmEmail: z.string().email().or(z.literal('')).default(''),
  dueDays: z.number().int().min(1).max(365).default(15),
  note: z.string().max(500).nullable().default(null),
});

export type ValidatedInvoiceInput = z.infer<typeof invoiceInputSchema>;

