/**
 * Keyboard Shortcuts Modal Manager:
 * Handles cheat-sheet display ('?') and key bindings.
 */
export interface Shortcut {
  key: string;
  ctrlOrCmd?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
}

export class ShortcutManager {
  private static shortcuts: Shortcut[] = [];
  private static modalEl: HTMLElement | null = null;

  static register(shortcut: Shortcut) {
    this.shortcuts.push(shortcut);
  }

  static init() {
    window.addEventListener('keydown', e => {
      // Don't fire shortcuts when typing in inputs/textareas
      const activeEl = document.activeElement;
      const isInput =
        activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);

      if (e.key === '?' && !isInput) {
        e.preventDefault();
        this.toggleHelpModal();
        return;
      }

      if (e.key === 'Escape' && this.modalEl) {
        this.closeHelpModal();
        return;
      }

      for (const s of this.shortcuts) {
        const matchesKey = e.key.toLowerCase() === s.key.toLowerCase();
        const matchesCtrl = s.ctrlOrCmd ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey;
        const matchesShift = s.shift ? e.shiftKey : !e.shiftKey;

        if (matchesKey && matchesCtrl && matchesShift) {
          if (!isInput || s.ctrlOrCmd) {
            e.preventDefault();
            s.action();
            break;
          }
        }
      }
    });
  }

  static toggleHelpModal() {
    if (this.modalEl) {
      this.closeHelpModal();
    } else {
      this.openHelpModal();
    }
  }

  static openHelpModal() {
    this.closeHelpModal();

    this.modalEl = document.createElement('div');
    this.modalEl.className = 'shortcut-modal-backdrop';
    this.modalEl.innerHTML = `
      <div class="shortcut-modal" role="dialog" aria-labelledby="shortcut-title" aria-modal="true">
        <div class="shortcut-header">
          <h3 id="shortcut-title">Keyboard Shortcuts</h3>
          <button class="shortcut-close-btn" aria-label="Close dialog">&times;</button>
        </div>
        <div class="shortcut-body">
          <div class="shortcut-row">
            <span class="shortcut-desc">Open / close shortcuts help</span>
            <kbd class="shortcut-key">?</kbd>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">Send chat message</span>
            <span class="shortcut-key-combo"><kbd>Enter</kbd></span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">Insert line break</span>
            <span class="shortcut-key-combo"><kbd>Shift</kbd> + <kbd>Enter</kbd></span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">Toggle Dark / Light theme</span>
            <span class="shortcut-key-combo"><kbd>Ctrl/Cmd</kbd> + <kbd>D</kbd></span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">Focus chat input</span>
            <span class="shortcut-key-combo"><kbd>/</kbd></span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">Print / Save as PDF</span>
            <span class="shortcut-key-combo"><kbd>Ctrl/Cmd</kbd> + <kbd>P</kbd></span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modalEl);

    this.modalEl.querySelector('.shortcut-close-btn')?.addEventListener('click', () => {
      this.closeHelpModal();
    });

    this.modalEl.addEventListener('click', e => {
      if (e.target === this.modalEl) {
        this.closeHelpModal();
      }
    });
  }

  static closeHelpModal() {
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
  }
}
