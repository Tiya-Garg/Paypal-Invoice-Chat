/**
 * Proposal Diff Card Generator:
 * Generates visual line-by-line diff previews with inline 1-click Approve / Reject triggers.
 */
export interface ProposalItemDiff {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  description: string;
  qtyFormatted: string;
  priceFormatted: string;
  previousPriceFormatted?: string;
}

export class ProposalCardRenderer {
  static renderProposalCard(
    proposal: {
      id: string;
      version: number;
      authorRole: string;
      summaries: string[];
      createdAt: string;
    },
    userRole: string,
    actions: {
      onApprove: (id: string) => void;
      onReject: (id: string) => void;
    },
  ): HTMLElement {
    const card = document.createElement('div');
    card.className = 'proposal-card';
    card.setAttribute('data-proposal-id', proposal.id);

    const header = document.createElement('div');
    header.className = 'proposal-card-header';
    header.innerHTML = `
      <span class="proposal-badge">Proposal for v${proposal.version}</span>
      <span class="proposal-timestamp">${new Date(proposal.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    `;
    card.appendChild(header);

    const summariesList = document.createElement('ul');
    summariesList.className = 'proposal-changes-list';
    for (const s of proposal.summaries) {
      const li = document.createElement('li');
      li.className = 'proposal-change-item';
      li.innerHTML = `<span class="change-icon">&bull;</span> <span>${s}</span>`;
      summariesList.appendChild(li);
    }
    card.appendChild(summariesList);

    if (userRole === 'seller') {
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'proposal-actions';

      const approveBtn = document.createElement('button');
      approveBtn.className = 'btn-proposal-approve';
      approveBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Approve & Apply
      `;
      approveBtn.onclick = () => actions.onApprove(proposal.id);

      const rejectBtn = document.createElement('button');
      rejectBtn.className = 'btn-proposal-reject';
      rejectBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        Decline
      `;
      rejectBtn.onclick = () => actions.onReject(proposal.id);

      actionsDiv.appendChild(approveBtn);
      actionsDiv.appendChild(rejectBtn);
      card.appendChild(actionsDiv);
    }

    return card;
  }
}
