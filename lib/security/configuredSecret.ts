const DEFAULT_MINIMUM_SECRET_LENGTH = 32;
const PLACEHOLDER_PREFIXES = ['change-me', 'changeme', 'example', 'replace-with', 'your-'];

export function readConfiguredSecret(
  name: 'BOOKING_TOKEN_SECRET' | 'PARTNER_ADMIN_KEY',
): string | null {
  const value = process.env[name];
  if (!value || !value.trim()) return null;

  if (process.env.NODE_ENV !== 'production') return value;

  const normalized = value.trim().toLowerCase();
  const isPlaceholder = PLACEHOLDER_PREFIXES.some((prefix) => normalized.startsWith(prefix));
  if (value.length < DEFAULT_MINIMUM_SECRET_LENGTH || isPlaceholder) return null;

  return value;
}
