/**
 * Toast Notification System:
 * Floating accessible alert toasts for user actions and live updates.
 */
export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  durationMs?: number;
  actionText?: string;
  onAction?: () => void;
}

export class ToastService {
  private static container: HTMLElement | null = null;

  private static getContainer(): HTMLElement {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.setAttribute('aria-live', 'assertive');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  static show(message: string, type: ToastType = 'info', options: ToastOptions = {}) {
    const container = this.getContainer();
    const duration = options.durationMs ?? 4000;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} toast-enter`;
    toast.setAttribute('role', 'alert');

    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.innerHTML = this.getIconSvg(type);
    toast.appendChild(iconSpan);

    const textSpan = document.createElement('span');
    textSpan.className = 'toast-message';
    textSpan.textContent = message;
    toast.appendChild(textSpan);

    if (options.actionText && options.onAction) {
      const btn = document.createElement('button');
      btn.className = 'toast-action-btn';
      btn.textContent = options.actionText;
      btn.onclick = () => {
        options.onAction!();
        toast.remove();
      };
      toast.appendChild(btn);
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close-btn';
    closeBtn.setAttribute('aria-label', 'Dismiss alert');
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => toast.remove();
    toast.appendChild(closeBtn);

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-leave');
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  private static getIconSvg(type: ToastType): string {
    switch (type) {
      case 'success':
        return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
      case 'warning':
        return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
      case 'error':
        return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
      default:
        return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }
  }
}
