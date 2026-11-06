export interface FormattedSummary {
  subtotalFormatted: string;
  discountFormatted?: string;
  taxFormatted?: string;
  totalFormatted: string;
}

export function formatTotalsBreakdown(
  subtotalMinor: bigint,
  discountMinor: bigint,
  taxMinor: bigint,
  totalMinor: bigint,
  currency: string,
): FormattedSummary {
  const fmt = (minor: bigint) =>
    new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
    }).format(Number(minor) / 100);

  return {
    subtotalFormatted: fmt(subtotalMinor),
    discountFormatted: discountMinor > 0n ? fmt(discountMinor) : undefined,
    taxFormatted: taxMinor > 0n ? fmt(taxMinor) : undefined,
    totalFormatted: fmt(totalMinor),
  };
}
