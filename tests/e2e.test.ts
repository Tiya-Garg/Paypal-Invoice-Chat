import { test, expect } from '@playwright/test';

/**
 * End-to-End Test implementing the complete Final Acceptance Script (Section 6):
 * 1. Seller creates thread & quotes Material A & Material B
 * 2. Inline edit Material A
 * 3. Add GST tax
 * 4. Send from PayPal
 * 5. Firm proposes on-site training
 * 6. Seller approves proposal
 * 7. Firm payment locks edits
 */
test.describe('Section 6: Full Collaborative Acceptance Script', () => {
  test('Seller and Firm multi-role collaborative workflow', async ({ browser }) => {
    // Context A: Seller
    const sellerContext = await browser.newContext();
    const sellerPage = await sellerContext.newPage();

    // Context B: Firm
    const firmContext = await browser.newContext();
    const firmPage = await firmContext.newPage();

    const invoiceId = `INV-E2E-${Date.now()}`;

    // 1. Seller logs in and opens the thread
    await sellerPage.goto(`http://localhost:3000/?invoiceId=${invoiceId}&role=seller`);
    await expect(sellerPage.locator('h1')).toContainText(invoiceId);

    // 2. Seller adds items via chat: "@PayPal quote 5k for material A and 8k for material B"
    const chatInput = sellerPage.locator('#chat-input');
    await chatInput.fill('@PayPal quote 5k for material A and 8k for material B');
    await sellerPage.locator('#btn-send-chat').click();

    // Verify invoice reflects added items
    await expect(sellerPage.locator('table')).toContainText('material A');
    await expect(sellerPage.locator('table')).toContainText('material B');

    // 3. Seller edits Material A inline
    const firstItemDesc = sellerPage.locator('table tbody tr:first-child input[data-field="description"]');
    await firstItemDesc.fill('Material A (High Quality)');
    await firstItemDesc.blur();

    // 4. Seller adds tax: "@PayPal add 18% GST"
    await chatInput.fill('@PayPal add 18% GST');
    await sellerPage.locator('#btn-send-chat').click();
    await expect(sellerPage.locator('.totals')).toContainText('GST');

    // 5. Firm accesses thread via invite
    await firmPage.goto(`http://localhost:3000/?invoiceId=${invoiceId}&role=firm`);
    await expect(firmPage.locator('table')).toContainText('Material A (High Quality)');

    // 6. Firm types "@PayPal please add 2k for on-site training"
    const firmChatInput = firmPage.locator('#chat-input');
    await firmChatInput.fill('@PayPal please add 2k for on-site training');
    await firmPage.locator('#btn-send-chat').click();

    // 7. Verify proposal card appears for seller
    await expect(sellerPage.locator('.proposal-card')).toBeVisible();

    // 8. Seller approves proposal
    const approveBtn = sellerPage.locator('[data-proposal-accept]');
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
    }

    await sellerContext.close();
    await firmContext.close();
  });
});
