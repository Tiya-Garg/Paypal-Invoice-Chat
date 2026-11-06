import { SUPPORTED_CURRENCIES } from './currencies.js';
import { MoneyArithmeticError } from './money.js';

/**
 * Validates currency ISO 4217 code compliance and decimals support
 */
export function validateCurrencyCode(code: string): string {
  const upper = code.trim().toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(upper as any)) {
    throw new MoneyArithmeticError(`Unsupported currency code: ${code}. Supported: ${SUPPORTED_CURRENCIES.join(', ')}`);
  }
  return upper;
}
