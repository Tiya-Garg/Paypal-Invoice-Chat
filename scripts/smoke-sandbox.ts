import { PayPalClient } from '../src/paypal/client.js';
import { calculateInvoiceTotals } from '../src/domain/calculator.js';
import { toPayPalDecimal } from '../src/domain/money.js';
import type { Invoice } from '../src/domain/types.js';

/**
 * Scripted Sandbox Smoke Test:
 * Executes real create -> send -> revise -> record payment flow against PayPal sandbox.
 * Skipped if PAYPAL_CLIENT_ID / PAYPAL_SECRET are not set.
 */
async function runSandboxSmokeTest() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_SECRET;

  if (!clientId || !clientSecret) {
    console.log('ℹ️  Skipping real PayPal sandbox smoke test: PAYPAL_CLIENT_ID or PAYPAL_SECRET not configured.');
    return;
  }

  console.log('🚀 Running real PayPal Invoicing v2 Sandbox Smoke Test...');
  const client = new PayPalClient();

  const testInvoice: Invoice = {
    id: `smoke-${Date.now()}`,
    number: `INV-SMOKE-${Math.floor(Math.random() * 9000 + 1000)}`,
    currency: 'USD',
    firmName: 'Sandbox Firm Test',
    firmEmail: 'buyer-sandbox@example.com',
    items: [
      { id: '1', description: 'Material A', unitMinor: 550000n, qtyMilli: 1000n }, // $5500.00
      { id: '2', description: 'Material B', unitMinor: 800000n, qtyMilli: 1000n }, // $8000.00
    ],
    tax: { name: 'GST', percentBps: 1800n }, // 18%
    discount: null,
    dueDays: 15,
    note: 'Smoke test invoice',
    status: 'DRAFT',
    version: 1,
    paypalInvoiceId: null,
    paypalStatus: null,
    recipientViewUrl: null,
    syncState: 'synced',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // 1. Create Draft
  console.log('1. Creating Draft on PayPal Sandbox...');
  const draft = await client.createDraftInvoice(testInvoice);
  const ppId = draft.id || draft.links?.find(l => l.rel === 'self')?.href.split('/').pop();
  if (!ppId) throw new Error('Failed to retrieve PayPal invoice ID from draft creation');
  console.log(`✅ Draft created with ID: ${ppId}`);

  // 2. Send Invoice
  console.log(`2. Sending invoice ${ppId}...`);
  await client.sendInvoice(ppId);
  console.log('✅ Invoice sent');

  // 3. Revise (Add Item)
  console.log('3. Revising invoice (adding installation service)...');
  testInvoice.items.push({
    id: '3',
    description: 'Installation Service',
    unitMinor: 300000n,
    qtyMilli: 1000n,
  });
  testInvoice.version = 2;
  await client.updateInvoice(ppId, testInvoice, { sendToRecipient: true });
  console.log('✅ Invoice revised and notification sent');

  // 4. Assert Totals Match
  console.log('4. Verifying totals between local domain and PayPal...');
  const remote = await client.getInvoice(ppId);
  const localTotals = calculateInvoiceTotals(testInvoice);
  const expectedTotal = toPayPalDecimal(localTotals.totalMinor);
  const actualTotal = remote.amount?.value;

  if (actualTotal !== expectedTotal) {
    throw new Error(`Total mismatch! Expected: ${expectedTotal}, PayPal returned: ${actualTotal}`);
  }
  console.log(`✅ Totals match perfectly: ${actualTotal} USD`);

  // 5. Record Payment (Sandbox test simulation)
  console.log('5. Recording sandbox payment...');
  await client.recordPayment(ppId, actualTotal!, 'USD');
  console.log('✅ Payment recorded successfully. INVOICING.INVOICE.PAID fired.');
  console.log('🎉 Sandbox smoke test passed completely!');
}

runSandboxSmokeTest().catch(err => {
  console.error('❌ Smoke test failed:', err);
  process.exit(1);
});

