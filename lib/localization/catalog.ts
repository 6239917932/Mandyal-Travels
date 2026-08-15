export const SUPPORTED_LOCALES = ['en-IN', 'hi-IN'] as const;
export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function isSupportedCurrency(value: string): value is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value.toUpperCase());
}

export function formatLocalizedMoney(
  amountMinor: number,
  currency: SupportedCurrency,
  locale: SupportedLocale,
): string {
  if (!Number.isSafeInteger(amountMinor)) throw new Error('Amount must use integer minor units.');
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amountMinor / 100);
}
