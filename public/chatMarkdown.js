/**
 * Lightweight safe markdown renderer for chat messages:
 * Supports **bold**, *italics*, `code`, @PayPal mentions, and line breaks without unsafe HTML injection.
 */
export function renderChatMarkdown(raw) {
  if (!raw) return '';

  // 1. First escape raw HTML entities
  let text = String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // 2. Bold: **text** or __text__
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // 3. Italics: *text* or _text_
  text = text.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
  text = text.replace(/_([^_\n]+?)_/g, '<em>$1</em>');

  // 4. Inline code: `code`
  text = text.replace(/`([^`\n]+?)`/g, '<code class="chat-inline-code">$1</code>');

  // 5. Highlight @PayPal mention
  text = text.replace(/(@PayPal\b)/gi, '<mark class="mention-paypal">$1</mark>');

  // 6. Highlight currency amounts like $500, €120, ₹13,000
  text = text.replace(/(\$|€|£|₹)\s?(\d{1,3}(,\d{3})*(\.\d{1,2})?|\d+(\.\d{1,2})?)/g, '<span class="amount-badge">$1$2</span>');

  // 7. Auto-link safe URLs
  text = text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>');

  // 8. Line breaks
  text = text.replace(/\n/g, '<br>');

  return text;
}
