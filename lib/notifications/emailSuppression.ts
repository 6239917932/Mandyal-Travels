import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const EMAIL_EVENT_MAXIMUM_BYTES = 64 * 1024;
export const EMAIL_EVENT_MAXIMUM_AGE_MS = 5 * 60_000;

export type EmailSuppressionReason = 'BOUNCE' | 'COMPLAINT';

export interface EmailProviderEventInput {
  eventId: string;
  eventType: EmailSuppressionReason;
  occurredAt: Date;
  providerMessageId: string;
  recipient: string;
}

function boundedText(value: unknown, maximumLength: number): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maximumLength &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

export function normalizeEmailRecipient(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized.length > 254 || !/^[^\s@]{1,64}@[^\s@.]+(?:\.[^\s@.]+)+$/.test(normalized)) {
    throw new Error('EMAIL_RECIPIENT_INVALID');
  }
  return normalized;
}

export function emailRecipientHash(recipient: string, secret: string): string {
  if (secret.length < 32) throw new Error('EMAIL_SUPPRESSION_NOT_CONFIGURED');
  return createHmac('sha256', secret)
    .update(`mandyal-email-suppression:v1:${normalizeEmailRecipient(recipient)}`)
    .digest('hex');
}

export function emailEventPayloadHash(payload: string): string {
  return createHash('sha256').update(payload).digest('hex');
}

export function verifyEmailEventWebhook(input: {
  now?: number;
  payload: string;
  provider: string;
  secret: string;
  signature: string;
  timestamp: string;
}): boolean {
  const timestamp = Number(input.timestamp);
  const now = input.now ?? Date.now();
  if (
    input.secret.length < 32 ||
    !/^[a-z0-9][a-z0-9_-]{0,49}$/.test(input.provider) ||
    !/^\d{1,12}$/.test(input.timestamp) ||
    !Number.isSafeInteger(timestamp) ||
    Math.abs(now - timestamp * 1_000) > EMAIL_EVENT_MAXIMUM_AGE_MS
  ) {
    return false;
  }
  const expected = createHmac('sha256', input.secret)
    .update(`${input.timestamp}.${input.provider}.${input.payload}`)
    .digest('hex');
  const received = input.signature.replace(/^sha256=/i, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(received)) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
}

export function parseEmailProviderEvent(
  payload: string,
  now = new Date(),
): EmailProviderEventInput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error('EMAIL_EVENT_PAYLOAD_INVALID');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('EMAIL_EVENT_PAYLOAD_INVALID');
  }
  const record = parsed as Record<string, unknown>;
  const rawType = typeof record.type === 'string' ? record.type.trim().toUpperCase() : '';
  if (
    !boundedText(record.eventId, 200) ||
    (rawType !== 'BOUNCE' && rawType !== 'COMPLAINT') ||
    !boundedText(record.recipient, 254) ||
    (record.providerMessageId !== undefined && !boundedText(record.providerMessageId, 200)) ||
    !boundedText(record.occurredAt, 50)
  ) {
    throw new Error('EMAIL_EVENT_PAYLOAD_INVALID');
  }
  const occurredAt = new Date(record.occurredAt);
  if (
    Number.isNaN(occurredAt.getTime()) ||
    occurredAt.getTime() > now.getTime() + EMAIL_EVENT_MAXIMUM_AGE_MS ||
    occurredAt.getTime() < now.getTime() - 366 * 24 * 60 * 60_000
  ) {
    throw new Error('EMAIL_EVENT_TIMESTAMP_INVALID');
  }
  return {
    eventId: record.eventId,
    eventType: rawType,
    occurredAt,
    providerMessageId: typeof record.providerMessageId === 'string' ? record.providerMessageId : '',
    recipient: normalizeEmailRecipient(record.recipient),
  };
}
