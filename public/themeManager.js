/**
 * Client-side Theme Controller:
 * Handles system preference detection, localStorage persistence, and DOM updates.
 */
export class ThemeManager {
  private static STORAGE_KEY = 'paypal_chat_theme';

  static getTheme(): 'light' | 'dark' {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  static setTheme(theme: 'light' | 'dark') {
    localStorage.setItem(this.STORAGE_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
    const event = new CustomEvent('themechange', { detail: { theme } });
    window.dispatchEvent(event);
  }

  static toggleTheme(): 'light' | 'dark' {
    const next = this.getTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
    return next;
  }

  static init() {
    const initial = this.getTheme();
    document.documentElement.setAttribute('data-theme', initial);

    // Watch OS system level preference changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem(this.STORAGE_KEY)) {
          this.setTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }
}
