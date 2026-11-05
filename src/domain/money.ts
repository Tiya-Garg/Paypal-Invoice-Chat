import type { Currency, Money } from './types.js';

export class MoneyArithmeticError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyArithmeticError';
  }
}

/**
 * Creates Money from integer minor units.
 */
export function makeMoney(minor: bigint, currency: Currency): Money {
  if (minor < 0n) {
    throw new MoneyArithmeticError(`Negative money is not allowed: ${minor}`);
  }
  return { minor, currency };
}

/**
 * Converts major unit number / string to minor units.
 * e.g., 50.25 USD -> 5025n
 * Disallows float precision loss by parsing as fixed string decimals.
 */
export function toMinorUnits(major: number | string): bigint {
  const str = String(major).trim();
  if (!/^(\d+)(\.\d{1,2})?$/.test(str)) {
    throw new MoneyArithmeticError(`Invalid monetary amount format: "${str}"`);
  }
  const parts = str.split('.');
  const wholePart = parts[0] ?? '0';
  const fracPart = (parts[1] ?? '').padEnd(2, '0').slice(0, 2);
  const minor = BigInt(wholePart) * 100n + BigInt(fracPart);
  if (minor <= 0n) {
    throw new MoneyArithmeticError('Monetary amount must be strictly positive');
  }
  return minor;
}

/**
 * Converts minor units to PayPal decimal string format: e.g. 5025n -> "50.25"
 * DOC: https://developer.paypal.com/api/invoicing/v2/#definition-money
 */
export function toPayPalDecimal(minor: bigint): string {
  const isNeg = minor < 0n;
  const abs = isNeg ? -minor : minor;
  const whole = abs / 100n;
  const frac = (abs % 100n).toString().padStart(2, '0');
  return `${isNeg ? '-' : ''}${whole}.${frac}`;
}

/**
 * Converts integer milli-quantity (1.000 = 1000n) to string decimal
 * DOC: https://developer.paypal.com/api/invoicing/v2/#definition-item
 */
export function toPayPalQuantity(qtyMilli: bigint): string {
  if (qtyMilli <= 0n) {
    throw new MoneyArithmeticError('Quantity must be greater than zero');
  }
  const whole = qtyMilli / 1000n;
  const frac = (qtyMilli % 1000n).toString().padStart(3, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : `${whole}`;
}

/**
 * Parses user or API quantity into milli-units (e.g. 1 -> 1000n, 2.5 -> 2500n, 0.125 -> 125n)
 */
export function toQtyMilli(qty: number | string): bigint {
  const str = String(qty).trim();
  if (!/^(\d+)(\.\d{1,3})?$/.test(str)) {
    throw new MoneyArithmeticError(`Invalid quantity format: "${str}"`);
  }
  const parts = str.split('.');
  const whole = parts[0] ?? '0';
  const frac = (parts[1] ?? '').padEnd(3, '0').slice(0, 3);
  const milli = BigInt(whole) * 1000n + BigInt(frac);
  if (milli <= 0n) {
    throw new MoneyArithmeticError('Quantity must be greater than zero');
  }
  return milli;
}

/**
 * Half-up rounding integer division: Math.round(numerator / denominator)
 */
export function divRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new MoneyArithmeticError('Division by zero');
  const remainder = numerator % denominator;
  const half = denominator / 2n;
  if (remainder >= half) {
    return numerator / denominator + 1n;
  }
  return numerator / denominator;
}

