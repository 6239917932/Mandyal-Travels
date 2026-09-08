import { createHash } from 'node:crypto';

export const HOTEL_ROOM_OPERATION_IDEMPOTENCY_PATTERN = /^[A-Za-z0-9_-]{16,96}$/;
export const HOTEL_MAINTENANCE_CATEGORIES = [
  'PLUMBING',
  'ELECTRICAL',
  'HVAC',
  'FURNITURE',
  'SAFETY',
  'OTHER',
] as const;
export const HOTEL_MAINTENANCE_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export const HOTEL_MAINTENANCE_TRANSITIONS = {
  OPEN: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  IN_PROGRESS: ['RESOLVED', 'CANCELLED'],
  RESOLVED: [],
  CANCELLED: [],
} as const;

export class HotelRoomOperationRuleError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function boundedText(value: unknown, maximum: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maximum);
}

export function requireRoomOperationIdempotencyKey(value: unknown): string {
  const key = boundedText(value, 96);
  if (!HOTEL_ROOM_OPERATION_IDEMPOTENCY_PATTERN.test(key)) {
    throw new HotelRoomOperationRuleError(
      'INVALID_IDEMPOTENCY_KEY',
      'Start this room operation again and retry.',
    );
  }
  return key;
}

export function roomOperationFingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function normalizeHousekeepingInspection(input: { note?: unknown; result?: unknown }) {
  const result = String(input.result ?? '')
    .trim()
    .toUpperCase();
  if (result !== 'PASSED' && result !== 'FAILED') {
    throw new HotelRoomOperationRuleError(
      'INVALID_INSPECTION_RESULT',
      'Choose passed or failed for the room inspection.',
    );
  }
  const note = boundedText(input.note, 300);
  if (result === 'FAILED' && note.length < 8) {
    throw new HotelRoomOperationRuleError(
      'INSPECTION_NOTE_REQUIRED',
      'Describe the failed inspection in at least eight characters.',
    );
  }
  return { note, result } as const;
}

export function normalizeMaintenanceWorkOrder(input: {
  category?: unknown;
  description?: unknown;
  priority?: unknown;
  summary?: unknown;
}) {
  const category = String(input.category ?? '')
    .trim()
    .toUpperCase();
  const priority = String(input.priority ?? '')
    .trim()
    .toUpperCase();
  const summary = boundedText(input.summary, 120);
  const description = boundedText(input.description, 600);
  if (!HOTEL_MAINTENANCE_CATEGORIES.some((value) => value === category)) {
    throw new HotelRoomOperationRuleError('INVALID_CATEGORY', 'Choose a maintenance category.');
  }
  if (!HOTEL_MAINTENANCE_PRIORITIES.some((value) => value === priority)) {
    throw new HotelRoomOperationRuleError('INVALID_PRIORITY', 'Choose a maintenance priority.');
  }
  if (summary.length < 5) {
    throw new HotelRoomOperationRuleError(
      'INVALID_SUMMARY',
      'Enter a maintenance summary of at least five characters.',
    );
  }
  return {
    category: category as (typeof HOTEL_MAINTENANCE_CATEGORIES)[number],
    description,
    priority: priority as (typeof HOTEL_MAINTENANCE_PRIORITIES)[number],
    summary,
  } as const;
}

export function normalizeMaintenanceTransition(input: {
  currentStatus: string;
  nextStatus?: unknown;
  note?: unknown;
}) {
  const currentStatus = input.currentStatus as keyof typeof HOTEL_MAINTENANCE_TRANSITIONS;
  const nextStatus = String(input.nextStatus ?? '')
    .trim()
    .toUpperCase();
  const allowed = HOTEL_MAINTENANCE_TRANSITIONS[currentStatus] ?? [];
  if (!(allowed as readonly string[]).includes(nextStatus)) {
    throw new HotelRoomOperationRuleError(
      'INVALID_STATUS_TRANSITION',
      'That maintenance status change is not allowed.',
    );
  }
  const note = boundedText(input.note, 400);
  if ((nextStatus === 'RESOLVED' || nextStatus === 'CANCELLED') && note.length < 8) {
    throw new HotelRoomOperationRuleError(
      'MAINTENANCE_NOTE_REQUIRED',
      'Enter a resolution or cancellation note of at least eight characters.',
    );
  }
  return { nextStatus: nextStatus as 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED', note };
}
