import { createHash } from 'node:crypto';

import { isIsoCalendarDate } from './operationalDate.ts';

export const NIGHT_AUDIT_IDEMPOTENCY_PATTERN = /^[A-Za-z0-9_-]{16,96}$/;

export type NightAuditBlockerCounts = Readonly<{
  openCashierShifts: number;
  overdueDepartures: number;
  pendingAmendments: number;
  unresolvedArrivals: number;
  urgentMaintenance: number;
}>;

export class NightAuditRuleError extends Error {
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

export function normalizeNightAuditClose(input: {
  businessDate?: unknown;
  confirmation?: unknown;
  note?: unknown;
}) {
  const businessDate = boundedText(input.businessDate, 10);
  if (!isIsoCalendarDate(businessDate)) {
    throw new NightAuditRuleError(
      'INVALID_BUSINESS_DATE',
      'Refresh and choose a valid business date.',
    );
  }
  if (boundedText(input.confirmation, 10) !== businessDate) {
    throw new NightAuditRuleError(
      'CONFIRMATION_REQUIRED',
      `Type ${businessDate} exactly to confirm the operational close.`,
    );
  }
  const note = boundedText(input.note, 300);
  if (note.length < 8) {
    throw new NightAuditRuleError(
      'INVALID_CLOSE_NOTE',
      'Enter a close note of at least eight characters.',
    );
  }
  return { businessDate, note } as const;
}

export function requireNightAuditIdempotencyKey(value: unknown): string {
  const key = typeof value === 'string' ? value.trim() : '';
  if (!NIGHT_AUDIT_IDEMPOTENCY_PATTERN.test(key)) {
    throw new NightAuditRuleError(
      'INVALID_IDEMPOTENCY_KEY',
      'Start the night audit close again and retry.',
    );
  }
  return key;
}

export function nightAuditFingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function countNightAuditBlockers(counts: NightAuditBlockerCounts): number {
  return Object.values(counts).reduce((total, count) => total + count, 0);
}
