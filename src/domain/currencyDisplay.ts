import type { Currency } from './types.js';

export interface CurrencyDisplayConfig {
  code: Currency;
  symbol: string;
  fractionDigits: number;
  locale: string;
}

const CURRENCY_CONFIGS: Record<Currency, CurrencyDisplayConfig> = {
  USD: { code: 'USD', symbol: '$', fractionDigits: 2, locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', fractionDigits: 2, locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', fractionDigits: 2, locale: 'en-GB' },
  INR: { code: 'INR', symbol: '₹', fractionDigits: 2, locale: 'en-IN' },
  AUD: { code: 'AUD', symbol: 'A$', fractionDigits: 2, locale: 'en-AU' },
  CAD: { code: 'CAD', symbol: 'C$', fractionDigits: 2, locale: 'en-CA' },
};

/**
 * Resolves standard display symbols and currency configuration for supported ISO currencies.
 */
export function getCurrencyConfig(code: string): CurrencyDisplayConfig {
  const normalized = (code || '').toUpperCase() as Currency;
  return CURRENCY_CONFIGS[normalized] ?? {
    code: 'USD',
    symbol: '$',
    fractionDigits: 2,
    locale: 'en-US',
  };
}

/**
 * Formats a minor-unit integer (e.g. cents, paise) into a localized currency string.
 */
export function formatCurrencyAmount(minor: bigint, code: Currency): string {
  const config = getCurrencyConfig(code);
  const factor = 10n ** BigInt(config.fractionDigits);
  const major = Number(minor) / Number(factor);

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: config.fractionDigits,
    maximumFractionDigits: config.fractionDigits,
  }).format(major);
}
