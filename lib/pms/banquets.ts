import { createHash } from 'node:crypto';

import { isIsoCalendarDate } from './operationalDate.ts';

export const HOTEL_BANQUET_EVENT_TYPES = [
  'CONFERENCE',
  'MEETING',
  'SOCIAL_EVENT',
  'WEDDING',
] as const;
export const HOTEL_BANQUET_STATUSES = [
  'INQUIRY',
  'PROVISIONAL',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
] as const;

export type HotelBanquetStatus = (typeof HOTEL_BANQUET_STATUSES)[number];

export class HotelBanquetRuleError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function text(value: unknown, maximum: number): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maximum) : '';
}

function requiredText(value: unknown, maximum: number, code: string, message: string): string {
  const normalized = text(value, maximum);
  if (normalized.length < 2) throw new HotelBanquetRuleError(code, message);
  return normalized;
}

function wholeNumber(value: unknown, minimum: number, maximum: number, code: string): number {
  const candidate = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  if (!Number.isSafeInteger(candidate) || candidate < minimum || candidate > maximum) {
    throw new HotelBanquetRuleError(code, `Enter a whole number from ${minimum} to ${maximum}.`);
  }
  return candidate;
}

function validTime(value: unknown, code: string): string {
  const candidate = text(value, 5);
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(candidate)) {
    throw new HotelBanquetRuleError(code, 'Enter a valid 24-hour time.');
  }
  return candidate;
}

export function normalizeHotelBanquetEvent(input: {
  contactEmail?: unknown;
  contactPhone?: unknown;
  endTime?: unknown;
  eventDate?: unknown;
  eventName?: unknown;
  eventType?: unknown;
  expectedGuests?: unknown;
  organizerName?: unknown;
  quoteAmount?: unknown;
  requirements?: unknown;
  startTime?: unknown;
  venueName?: unknown;
}) {
  const eventDate = text(input.eventDate, 10);
  if (!isIsoCalendarDate(eventDate)) {
    throw new HotelBanquetRuleError('INVALID_EVENT_DATE', 'Choose a valid event date.');
  }
  const startTime = validTime(input.startTime, 'INVALID_START_TIME');
  const endTime = validTime(input.endTime, 'INVALID_END_TIME');
  if (endTime <= startTime) {
    throw new HotelBanquetRuleError(
      'INVALID_EVENT_WINDOW',
      'The end time must be after the start time.',
    );
  }
  const eventType = text(input.eventType, 40).toUpperCase();
  if (
    !HOTEL_BANQUET_EVENT_TYPES.includes(eventType as (typeof HOTEL_BANQUET_EVENT_TYPES)[number])
  ) {
    throw new HotelBanquetRuleError('INVALID_EVENT_TYPE', 'Choose a valid event type.');
  }
  const contactEmail = text(input.contactEmail, 160).toLowerCase();
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    throw new HotelBanquetRuleError('INVALID_CONTACT_EMAIL', 'Enter a valid contact email.');
  }
  const contactPhone = text(input.contactPhone, 32);
  if (contactPhone && !/^\+?[0-9 ()-]{7,32}$/.test(contactPhone)) {
    throw new HotelBanquetRuleError('INVALID_CONTACT_PHONE', 'Enter a valid contact phone number.');
  }
  if (!contactEmail && !contactPhone) {
    throw new HotelBanquetRuleError('CONTACT_REQUIRED', 'Enter an email address or phone number.');
  }
  return {
    contactEmail,
    contactPhone,
    endTime,
    eventDate,
    eventName: requiredText(input.eventName, 120, 'INVALID_EVENT_NAME', 'Enter an event name.'),
    eventType,
    expectedGuests: wholeNumber(input.expectedGuests, 1, 10_000, 'INVALID_GUEST_COUNT'),
    organizerName: requiredText(
      input.organizerName,
      120,
      'INVALID_ORGANIZER',
      'Enter the organizer name.',
    ),
    quoteAmount: wholeNumber(input.quoteAmount, 0, 100_000_000, 'INVALID_QUOTE_AMOUNT'),
    requirements: text(input.requirements, 1_000),
    startTime,
    venueName: requiredText(input.venueName, 120, 'INVALID_VENUE', 'Enter a venue name.'),
  } as const;
}

export function nextHotelBanquetStatuses(
  status: HotelBanquetStatus,
): readonly HotelBanquetStatus[] {
  if (status === 'INQUIRY') return ['PROVISIONAL', 'CANCELLED'];
  if (status === 'PROVISIONAL') return ['CONFIRMED', 'CANCELLED'];
  if (status === 'CONFIRMED') return ['COMPLETED', 'CANCELLED'];
  return [];
}

export function normalizeHotelBanquetTransition(input: {
  currentStatus: string;
  note?: unknown;
  targetStatus?: unknown;
}) {
  const currentStatus = input.currentStatus as HotelBanquetStatus;
  if (!HOTEL_BANQUET_STATUSES.includes(currentStatus)) {
    throw new HotelBanquetRuleError('INVALID_EVENT_STATE', 'Refresh this event and try again.');
  }
  const targetStatus = text(input.targetStatus, 20).toUpperCase() as HotelBanquetStatus;
  if (!nextHotelBanquetStatuses(currentStatus).includes(targetStatus)) {
    throw new HotelBanquetRuleError(
      'INVALID_EVENT_TRANSITION',
      'This event cannot move to the selected state.',
    );
  }
  const note = text(input.note, 500);
  if (targetStatus === 'CANCELLED' && note.length < 8) {
    throw new HotelBanquetRuleError(
      'CANCELLATION_REASON_REQUIRED',
      'Enter a cancellation reason of at least eight characters.',
    );
  }
  return { note, targetStatus } as const;
}

export function requireHotelBanquetIdempotencyKey(value: unknown): string {
  const key = text(value, 96);
  if (!/^[A-Za-z0-9_-]{16,96}$/.test(key)) {
    throw new HotelBanquetRuleError('INVALID_IDEMPOTENCY_KEY', 'Start this event action again.');
  }
  return key;
}

export function hotelBanquetFingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
