/**
 * Audit Trail Drawer Controller:
 * Displays slide-out chronological timeline of invoice modifications, proposals, and approvals.
 */
export interface AuditEntry {
  id: string;
  version: number;
  authorRole: string;
  summary: string;
  timestamp: string;
}

export class AuditDrawerController {
  private static drawerEl: HTMLElement | null = null;

  static toggle(entries: AuditEntry[]) {
    if (this.drawerEl) {
      this.close();
    } else {
      this.open(entries);
    }
  }

  static open(entries: AuditEntry[]) {
    this.close();

    this.drawerEl = document.createElement('div');
    this.drawerEl.className = 'audit-drawer-backdrop';
    this.drawerEl.innerHTML = `
      <div class="audit-drawer" role="dialog" aria-labelledby="audit-title" aria-modal="true">
        <div class="audit-drawer-header">
          <h3 id="audit-title">Invoice Audit Trail</h3>
          <button class="audit-close-btn" aria-label="Close audit drawer">&times;</button>
        </div>
        <div class="audit-drawer-body">
          ${
            entries.length === 0
              ? '<p class="audit-empty">No revisions recorded yet.</p>'
              : `
              <div class="audit-timeline">
                ${entries
                  .map(
                    e => `
                  <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                      <div class="timeline-header">
                        <span class="timeline-version">Version ${e.version}</span>
                        <span class="timeline-role role-${e.authorRole}">${e.authorRole}</span>
                        <span class="timeline-time">${new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div class="timeline-summary">${e.summary}</div>
                    </div>
                  </div>
                `,
                  )
                  .join('')}
              </div>
            `
          }
        </div>
      </div>
    `;

    document.body.appendChild(this.drawerEl);

    this.drawerEl.querySelector('.audit-close-btn')?.addEventListener('click', () => {
      this.close();
    });

    this.drawerEl.addEventListener('click', e => {
      if (e.target === this.drawerEl) {
        this.close();
      }
    });
  }

  static close() {
    if (this.drawerEl) {
      this.drawerEl.remove();
      this.drawerEl = null;
    }
  }
}
