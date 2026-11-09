/**
 * Role Switcher Simulation Toolbar:
 * Provides a sticky developer toolbar when simulating seller and firm roles side-by-side.
 */
export function renderDevRoleToolbar(currentRole: string, invoiceId: string): HTMLElement {
  const toolbar = document.createElement('div');
  toolbar.className = 'dev-role-toolbar';
  toolbar.innerHTML = `
    <span class="dev-role-title">Preview Role:</span>
    <a href="/?invoiceId=${invoiceId}&role=seller" class="dev-role-btn ${currentRole === 'seller' ? 'is-active' : ''}">Seller</a>
    <a href="/?invoiceId=${invoiceId}&role=firm" class="dev-role-btn ${currentRole === 'firm' ? 'is-active' : ''}">Buyer</a>
    <button class="dev-role-copy-invite" title="Copy Buyer Invite Link">Share Link</button>
  `;

  toolbar.querySelector('.dev-role-copy-invite')?.addEventListener('click', () => {
    const buyerUrl = `${location.origin}/?invoiceId=${invoiceId}&role=firm`;
    navigator.clipboard.writeText(buyerUrl).then(() => {
      alert('Buyer invite link copied to clipboard!');
    });
  });

  return toolbar;
}
