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

  const summary: FormattedSummary = {
    subtotalFormatted: fmt(subtotalMinor),
    totalFormatted: fmt(totalMinor),
  };
  if (discountMinor > 0n) {
    summary.discountFormatted = fmt(discountMinor);
  }
  if (taxMinor > 0n) {
    summary.taxFormatted = fmt(taxMinor);
  }
  return summary;
}

