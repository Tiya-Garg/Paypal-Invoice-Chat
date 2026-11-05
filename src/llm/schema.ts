import { z } from 'zod';

export const editInvoiceToolSchema = {
  name: 'edit_invoice',
  description: 'Propose structured edits to the invoice domain',
  input_schema: {
    type: 'object',
    required: ['ops'],
    properties: {
      say: {
        type: 'string',
        description: 'Natural language feedback or clarifying question if ambiguous',
      },
      ops: {
        type: 'array',
        items: {
          type: 'object',
          required: ['op'],
          properties: {
            op: {
              type: 'string',
              enum: [
                'set_firm',
                'add_item',
                'update_item',
                'remove_item',
                'set_tax',
                'set_discount',
                'set_due_days',
                'set_note',
              ],
            },
            name: { type: 'string' },
            email: { type: 'string' },
            description: { type: 'string' },
            unitPrice: { type: 'number' },
            qty: { type: 'number' },
            match: { type: 'string' },
            percent: { type: 'number' },
            kind: { type: 'string', enum: ['percent', 'amount'] },
            value: { type: 'number' },
            days: { type: 'number' },
            note: { type: 'string' },
          },
        },
      },
    },
  },
};

export const zodToolOutputSchema = z.object({
  say: z.string().optional(),
  ops: z
    .array(
      z.discriminatedUnion('op', [
        z.object({
          op: z.literal('set_firm'),
          name: z.string().optional(),
          email: z.string().email().optional(),
        }),
        z.object({
          op: z.literal('add_item'),
          description: z.string().min(1),
          unitPrice: z.number().positive(),
          qty: z.number().positive().optional(),
        }),
        z.object({
          op: z.literal('update_item'),
          match: z.string().min(1),
          description: z.string().optional(),
          unitPrice: z.number().positive().optional(),
          qty: z.number().positive().optional(),
        }),
        z.object({
          op: z.literal('remove_item'),
          match: z.string().min(1),
        }),
        z.object({
          op: z.literal('set_tax'),
          name: z.string().default('Tax'),
          percent: z.number().nullable(),
        }),
        z.object({
          op: z.literal('set_discount'),
          kind: z.enum(['percent', 'amount']),
          value: z.number().nullable(),
        }),
        z.object({
          op: z.literal('set_due_days'),
          days: z.number().int().positive(),
        }),
        z.object({
          op: z.literal('set_note'),
          note: z.string().nullable(),
        }),
      ]),
    )
    .max(10), // Safety rail: max 10 ops per message
});
