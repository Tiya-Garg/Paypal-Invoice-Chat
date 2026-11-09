/**
 * Currency Switcher Dropdown Controller:
 * Enables switching currency display formatting in invoice review header.
 */
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', locale: 'en-CA' },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar', locale: 'en-AU' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
];

export function renderCurrencySelector(
  currentCode: string,
  onSelect: (code: string) => void,
): HTMLElement {
  const select = document.createElement('select');
  select.className = 'currency-selector-select';
  select.setAttribute('aria-label', 'Select Invoice Currency');

  for (const c of SUPPORTED_CURRENCIES) {
    const opt = document.createElement('option');
    opt.value = c.code;
    opt.textContent = `${c.code} (${c.symbol})`;
    if (c.code === currentCode) {
      opt.selected = true;
    }
    select.appendChild(opt);
  }

  select.addEventListener('change', () => {
    onSelect(select.value);
  });

  return select;
}
