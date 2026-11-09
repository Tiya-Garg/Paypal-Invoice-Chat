/**
 * Quick Mention Suggestion Dropdown:
 * Suggests available commands and mention auto-completions when typing '@' or '/' in the chat input.
 */
export interface MentionSuggestion {
  label: string;
  insertText: string;
  description: string;
}

export const MENTION_SUGGESTIONS: MentionSuggestion[] = [
  { label: '@PayPal add [item] [price]', insertText: '@PayPal add ', description: 'Add new line item' },
  { label: '@PayPal remove [item]', insertText: '@PayPal remove ', description: 'Remove existing line item' },
  { label: '@PayPal update [item] to [qty/price]', insertText: '@PayPal update ', description: 'Modify quantity or price' },
  { label: '@PayPal discount [percent/amount]', insertText: '@PayPal 10% discount', description: 'Apply invoice discount' },
  { label: '@PayPal tax [percent]', insertText: '@PayPal 18% GST', description: 'Set tax rate' },
  { label: '@PayPal note [text]', insertText: '@PayPal note: ', description: 'Set customer note' },
];

export class MentionAutocomplete {
  private static popupEl: HTMLElement | null = null;
  private static activeIndex = 0;

  static check(
    inputEl: HTMLTextAreaElement | HTMLInputElement,
    containerEl: HTMLElement,
    onSelect: (text: string) => void,
  ) {
    const val = inputEl.value;
    const cursor = inputEl.selectionStart || 0;
    const lastAt = val.lastIndexOf('@', cursor);

    if (lastAt !== -1 && cursor - lastAt <= 10) {
      const query = val.slice(lastAt + 1, cursor).toLowerCase();
      const matches = MENTION_SUGGESTIONS.filter(s =>
        s.label.toLowerCase().includes(query) || s.description.toLowerCase().includes(query),
      );

      if (matches.length > 0) {
        this.show(matches, containerEl, text => {
          const before = val.slice(0, lastAt);
          const after = val.slice(cursor);
          inputEl.value = before + text + after;
          inputEl.focus();
          onSelect(inputEl.value);
          this.hide();
        });
        return;
      }
    }

    this.hide();
  }

  static show(
    suggestions: MentionSuggestion[],
    containerEl: HTMLElement,
    onSelect: (text: string) => void,
  ) {
    this.hide();
    this.activeIndex = 0;

    this.popupEl = document.createElement('div');
    this.popupEl.className = 'mention-popup';

    suggestions.forEach((s, idx) => {
      const item = document.createElement('div');
      item.className = `mention-popup-item ${idx === 0 ? 'is-active' : ''}`;
      item.innerHTML = `
        <span class="mention-popup-label">${s.label}</span>
        <span class="mention-popup-desc">${s.description}</span>
      `;
      item.onclick = () => onSelect(s.insertText);
      this.popupEl!.appendChild(item);
    });

    containerEl.appendChild(this.popupEl);
  }

  static hide() {
    if (this.popupEl) {
      this.popupEl.remove();
      this.popupEl = null;
    }
  }
}
