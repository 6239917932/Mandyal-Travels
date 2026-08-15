const SAFE_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{1,99}$/;

export class ChannelRuleError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export function normalizeProviderName(value: unknown): string {
  if (typeof value !== 'string')
    throw new ChannelRuleError('INVALID_PROVIDER', 'Provider is required.');
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (normalized.length < 2 || normalized.length > 80) {
    throw new ChannelRuleError('INVALID_PROVIDER', 'Provider must contain 2 to 80 characters.');
  }
  return normalized;
}

export function normalizeExternalReference(value: unknown, label: string): string {
  if (typeof value !== 'string' || !SAFE_REFERENCE.test(value.trim())) {
    throw new ChannelRuleError(
      'INVALID_EXTERNAL_REFERENCE',
      `${label} must be a safe 2 to 100 character reference.`,
    );
  }
  return value.trim();
}

export function normalizeSyncDirection(value: unknown): 'PULL' | 'PUSH' | 'BIDIRECTIONAL' {
  if (value === 'PULL' || value === 'PUSH' || value === 'BIDIRECTIONAL') return value;
  throw new ChannelRuleError(
    'INVALID_SYNC_DIRECTION',
    'Choose pull, push, or bidirectional synchronization.',
  );
}
