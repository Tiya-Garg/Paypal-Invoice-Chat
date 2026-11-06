// DOC: https://developer.paypal.com/api/invoicing/v2/#definition-currency_code
export const SUPPORTED_CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'CAD', 'AUD'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export function isSupportedCurrency(c: string): c is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(c as SupportedCurrency);
}

