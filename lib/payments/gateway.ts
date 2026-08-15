export function isSafeHostedCheckoutUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return false;
  }
}

export function paymentIntentExpiry(now = new Date()): Date {
  return new Date(now.getTime() + 20 * 60 * 1_000);
}
