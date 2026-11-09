import { describe, it, expect } from 'vitest';
import { renderChatMarkdown } from '../public/chatMarkdown.js';

describe('renderChatMarkdown unit suite', () => {
  it('escapes dangerous HTML tags to prevent XSS', () => {
    const malicious = '<script>alert(1)</script><img src="x" onerror="evil()"/>';
    const rendered = renderChatMarkdown(malicious);
    expect(rendered).not.toContain('<script>');
    expect(rendered).toContain('&lt;script&gt;');
    expect(rendered).not.toContain('onerror=');
  });

  it('renders bold and italic formatting', () => {
    const text = 'This is **bold** and this is *italic*';
    const rendered = renderChatMarkdown(text);
    expect(rendered).toContain('<strong>bold</strong>');
    expect(rendered).toContain('<em>italic</em>');
  });

  it('highlights @PayPal mentions', () => {
    const text = 'Hey @PayPal please add 5 hours of consulting';
    const rendered = renderChatMarkdown(text);
    expect(rendered).toContain('<mark class="mention-paypal">@PayPal</mark>');
  });

  it('wraps currency amounts with amount badge', () => {
    const text = 'Item price is $1,250.50 and total is €400';
    const rendered = renderChatMarkdown(text);
    expect(rendered).toContain('<span class="amount-badge">$1,250.50</span>');
    expect(rendered).toContain('<span class="amount-badge">€400</span>');
  });

  it('converts newlines to br tags', () => {
    const text = 'Line 1\nLine 2';
    const rendered = renderChatMarkdown(text);
    expect(rendered).toBe('Line 1<br>Line 2');
  });
});
