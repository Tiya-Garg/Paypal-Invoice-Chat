import { goldenCases, type GoldenCase } from './goldenCases.js';
import { LlmPipeline } from '../src/llm/pipeline.js';
import type { Invoice } from '../src/domain/types.js';

export interface EvalReport {
  total: number;
  passed: number;
  failed: number;
  accuracyPercent: number;
  failures: Array<{
    input: string;
    role: string;
    expectedPrimaryOp: string;
    expectedOpCount: number;
    actualOps: string[];
  }>;
}

export async function runGoldenEvals(
  pipeline: LlmPipeline = new LlmPipeline(),
  invoice?: Invoice,
  cases: GoldenCase[] = goldenCases,
): Promise<EvalReport> {
  const targetInvoice: Invoice = invoice ?? {
    id: 'eval-inv-auto',
    number: 'INV-EVAL-AUTO',
    currency: 'USD',
    firmName: 'Firm X',
    firmEmail: 'ap@firmx.test',
    items: [
      { id: '1', description: 'Material A', unitMinor: 500000n, qtyMilli: 1000n },
      { id: '2', description: 'Material B', unitMinor: 800000n, qtyMilli: 1000n },
      { id: '3', description: 'consulting', unitMinor: 100000n, qtyMilli: 1000n },
      { id: '4', description: 'delivery', unitMinor: 50000n, qtyMilli: 1000n },
      { id: '5', description: 'maintenance', unitMinor: 500000n, qtyMilli: 1000n },
      { id: '6', description: 'annual license', unitMinor: 15000000n, qtyMilli: 1000n },
      { id: '7', description: 'project setup', unitMinor: 20000000n, qtyMilli: 1000n },
    ],
    tax: null,
    discount: null,
    dueDays: 14,
    note: null,
    status: 'SENT',
    version: 1,
    paypalInvoiceId: 'PP-EVAL-AUTO',
    paypalStatus: 'SENT',
    recipientViewUrl: null,
    syncState: 'synced',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const failures: EvalReport['failures'] = [];
  let passed = 0;

  for (const c of cases) {
    const result = await pipeline.parse(c.input, targetInvoice, c.role);
    let ok = false;

    if (c.expectedOpCount === 0) {
      ok = result.ops.length === 0;
    } else {
      const hasMatch = result.ops.some(op => op.op === c.expectedPrimaryOp);
      ok = hasMatch && result.ops.length >= c.expectedOpCount;
    }

    if (ok) {
      passed += 1;
    } else {
      failures.push({
        input: c.input,
        role: c.role,
        expectedPrimaryOp: c.expectedPrimaryOp,
        expectedOpCount: c.expectedOpCount,
        actualOps: result.ops.map(o => o.op),
      });
    }
  }

  const total = cases.length;
  const accuracyPercent = total === 0 ? 100 : Math.round((passed / total) * 10000) / 100;

  return {
    total,
    passed,
    failed: failures.length,
    accuracyPercent,
    failures,
  };
}

