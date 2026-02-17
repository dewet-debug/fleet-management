const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
  JPY: '\u00A5',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
  ZAR: 'R',
  NGN: '\u20A6',
  KES: 'KSh',
  INR: '\u20B9',
};

export const CURRENCY_OPTIONS = Object.entries(CURRENCY_SYMBOLS).map(([code, symbol]) => ({
  value: code,
  label: `${code} (${symbol})`,
}));

export function formatCurrency(amount: number | null | undefined, currencyCode: string = 'ZAR'): string {
  if (amount == null) return 'N/A';
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;
  return `${symbol}${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
