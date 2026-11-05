export interface ParseResult {
  amountMinor: bigint | null;
  currency: string;
}

/**
 * Parses diverse locale currency amount formats into integer minor units:
 * - "5k", "$5k", "5000", "5,000", "$5,000" -> 500,000 minor units
 * - "1.5k" -> 150,000 minor units
 * - "2L", "1.5L", "1.5 lakh", "2 lakh" -> 15,000,000 / 20,000,000 minor units
 * - "₹5,000", "5000 rupees" -> 500,000 minor units
 */
export function parseLocaleAmount(input: string, defaultCurrency = 'USD'): ParseResult {
  const clean = input.trim();
  let detectedCurrency = defaultCurrency;

  if (/[₹]|rupee/i.test(clean)) {
    detectedCurrency = 'INR';
  } else if (/[$]|dollar/i.test(clean)) {
    detectedCurrency = 'USD';
  } else if (/[€]|euro/i.test(clean)) {
    detectedCurrency = 'EUR';
  } else if (/[£]|pound/i.test(clean)) {
    detectedCurrency = 'GBP';
  }

  // Strip symbols, commas, and currency words
  const sanitized = clean
    .replace(/[$,₹€£]/g, '')
    .replace(/\b(usd|inr|eur|gbp|rupees?|dollars?)\b/gi, '')
    .trim();

  // 1. Lakh representation: "1.5 lakh", "1.5L", "2 lakh", "2L" (1 lakh = 100,000)
  const lakhMatch = sanitized.match(/^(\d+(?:\.\d+)?)\s*(?:lakhs?|l)\b/i);
  if (lakhMatch && lakhMatch[1]) {
    const val = parseFloat(lakhMatch[1]);
    const minor = BigInt(Math.round(val * 100_000 * 100));
    return { amountMinor: minor, currency: detectedCurrency };
  }

  // 2. Thousands 'k': "5k", "1.5k"
  const kMatch = sanitized.match(/^(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch && kMatch[1]) {
    const val = parseFloat(kMatch[1]);
    const minor = BigInt(Math.round(val * 1_000 * 100));
    return { amountMinor: minor, currency: detectedCurrency };
  }

  // 3. Regular decimal/integer: "5000", "5,000", "50.25"
  const numMatch = sanitized.replace(/,/g, '').match(/^(\d+(?:\.\d{1,2})?)$/);
  if (numMatch && numMatch[1]) {
    const parts = numMatch[1].split('.');
    const whole = parts[0] ?? '0';
    const frac = (parts[1] ?? '').padEnd(2, '0').slice(0, 2);
    const minor = BigInt(whole) * 100n + BigInt(frac);
    return { amountMinor: minor, currency: detectedCurrency };
  }

  return { amountMinor: null, currency: detectedCurrency };
}

