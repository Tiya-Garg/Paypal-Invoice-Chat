import type { DomainOp } from '../domain/ops.js';
import { parseLocaleAmount } from './localeAmount.js';

/**
 * Deterministic regex fallback parser for common invoice edits:
 * Runs when Anthropic API times out (>8s) or is unavailable.
 */
export function regexFallbackParser(text: string, defaultCurrency = 'USD'): DomainOp[] {
  let clean = text.trim();
  clean = clean.replace(/^[,\s]*@paypal[,:\s]*/i, '');
  clean = clean.replace(/^[,\s]*hey\s+paypal[,:\s]*/i, '');
  clean = clean.replace(/[!.]+$/, '').trim();

  const ops: DomainOp[] = [];

  // 1. Tax: e.g. "add 18% GST" or "18% GST" or "set 10% VAT"
  const taxMatch = clean.match(/(?:add|set)?\s*(\d+(?:\.\d+)?)\s*%\s*([A-Za-z]+)?/i);
  if (taxMatch && taxMatch[1]) {
    const pct = parseFloat(taxMatch[1]);
    const name = taxMatch[2] ? taxMatch[2].trim() : 'Tax';
    ops.push({ op: 'set_tax', name, percent: pct });
    return ops;
  }

  // 2. Add item pattern A: "add 3k for installation service"
  const addMatchA = clean.match(/^add\s+([^,]+?)\s+for\s+(.+)$/i);
  if (addMatchA && addMatchA[1] && addMatchA[2]) {
    const amtParsed = parseLocaleAmount(addMatchA[1], defaultCurrency);
    if (amtParsed.amountMinor !== null) {
      const unitMajor = Number(amtParsed.amountMinor) / 100;
      ops.push({ op: 'add_item', description: addMatchA[2].trim(), unitPrice: unitMajor });
      return ops;
    }
  }

  // 3. Add item pattern B: "add installation service for 3k"
  const addMatchB = clean.match(/^add\s+(.+?)\s+(?:for|at)\s+([^,]+)$/i);
  if (addMatchB && addMatchB[1] && addMatchB[2]) {
    const amtParsed = parseLocaleAmount(addMatchB[2], defaultCurrency);
    if (amtParsed.amountMinor !== null) {
      const unitMajor = Number(amtParsed.amountMinor) / 100;
      ops.push({ op: 'add_item', description: addMatchB[1].trim(), unitPrice: unitMajor });
      return ops;
    }
  }

  // 4. Update item: "change Material A to 5.5k"
  const updateMatch = clean.match(/^(?:change|update)\s+(.+?)\s+to\s+([^,]+)$/i);
  if (updateMatch && updateMatch[1] && updateMatch[2]) {
    const amtParsed = parseLocaleAmount(updateMatch[2], defaultCurrency);
    if (amtParsed.amountMinor !== null) {
      const unitMajor = Number(amtParsed.amountMinor) / 100;
      ops.push({ op: 'update_item', match: updateMatch[1].trim(), unitPrice: unitMajor });
      return ops;
    }
  }

  // 5. Remove item: "remove Material A"
  const removeMatch = clean.match(/^remove\s+(.+)$/i);
  if (removeMatch && removeMatch[1]) {
    ops.push({ op: 'remove_item', match: removeMatch[1].trim() });
    return ops;
  }

  return ops;
}
