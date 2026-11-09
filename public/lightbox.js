/**
 * Fullscreen Image & Attachment Lightbox:
 * Enables inspecting receipts, logos, or invoice attachments in an accessible full-screen overlay.
 */
export class LightboxController {
  private static overlayEl: HTMLElement | null = null;

  static show(imageUrl: string, title = 'Attachment Preview') {
    this.close();

    this.overlayEl = document.createElement('div');
    this.overlayEl.className = 'lightbox-backdrop';
    this.overlayEl.innerHTML = `
      <div class="lightbox-modal" role="dialog" aria-modal="true" aria-label="${title}">
        <div class="lightbox-bar">
          <span class="lightbox-title">${title}</span>
          <button class="lightbox-close-btn" aria-label="Close image">&times;</button>
        </div>
        <div class="lightbox-content">
          <img src="${imageUrl}" alt="${title}" class="lightbox-img" />
        </div>
      </div>
    `;

    document.body.appendChild(this.overlayEl);

    this.overlayEl.querySelector('.lightbox-close-btn')?.addEventListener('click', () => {
      this.close();
    });

    this.overlayEl.addEventListener('click', e => {
      if (e.target === this.overlayEl) {
        this.close();
      }
    });

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
        window.removeEventListener('keydown', handleEsc);
      }
    };
    window.addEventListener('keydown', handleEsc);
  }

  static close() {
    if (this.overlayEl) {
      this.overlayEl.remove();
      this.overlayEl = null;
    }
  }
}
