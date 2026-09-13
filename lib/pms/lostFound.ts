import { createHash } from 'node:crypto';

import { calendarDateInTimezone, isIsoCalendarDate } from './operationalDate.ts';

export const HOTEL_LOST_FOUND_STATUSES = ['IN_CUSTODY', 'MATCHED', 'RETURNED', 'DISPOSED'] as const;

const clean = (value: unknown, maximum: number) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maximum) : '';

const normalizedCode = (value: unknown, maximum: number) =>
  clean(value, maximum)
    .toUpperCase()
    .replace(/[^A-Z0-9._/-]/g, '');

const version = (value: unknown) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

export function normalizeLostFoundItem(input: Record<string, unknown>) {
  const referenceCode = normalizedCode(input.referenceCode, 40);
  const itemName = clean(input.itemName, 120);
  const description = clean(input.description, 500);
  const foundLocation = clean(input.foundLocation, 120);
  const storageLocation = clean(input.storageLocation, 120);
  const foundOn = clean(input.foundOn, 10);
  const foundBy = clean(input.foundBy, 120);
  const reservationReference = normalizedCode(input.reservationReference, 80);
  const today = calendarDateInTimezone('Asia/Kolkata');
  if (
    referenceCode.length < 3 ||
    itemName.length < 2 ||
    description.length < 5 ||
    foundLocation.length < 2 ||
    storageLocation.length < 2 ||
    foundBy.length < 2 ||
    !isIsoCalendarDate(foundOn) ||
    foundOn > today
  ) {
    return null;
  }
  return {
    description,
    foundBy,
    foundLocation,
    foundOn,
    itemName,
    referenceCode,
    reservationReference,
    storageLocation,
  };
}

export function normalizeLostFoundEvent(input: Record<string, unknown>) {
  const itemId = clean(input.itemId, 100);
  const toStatus = clean(input.toStatus, 20).toUpperCase();
  const expectedVersion = version(input.expectedVersion);
  const note = clean(input.note, 500);
  const releasedTo = clean(input.releasedTo, 120);
  const releaseEvidenceReference = normalizedCode(input.releaseEvidenceReference, 100);
  if (
    !itemId ||
    expectedVersion === null ||
    note.length < 5 ||
    !HOTEL_LOST_FOUND_STATUSES.includes(toStatus as (typeof HOTEL_LOST_FOUND_STATUSES)[number]) ||
    (toStatus === 'RETURNED' && (releasedTo.length < 2 || releaseEvidenceReference.length < 4)) ||
    (toStatus === 'DISPOSED' && releaseEvidenceReference.length < 4)
  ) {
    return null;
  }
  return { expectedVersion, itemId, note, releasedTo, releaseEvidenceReference, toStatus };
}

export function isLostFoundTransitionAllowed(fromStatus: string, toStatus: string) {
  const transitions: Readonly<Record<string, readonly string[]>> = {
    IN_CUSTODY: ['MATCHED', 'RETURNED', 'DISPOSED'],
    MATCHED: ['IN_CUSTODY', 'RETURNED', 'DISPOSED'],
  };
  return transitions[fromStatus]?.includes(toStatus) ?? false;
}

export function lostFoundRequestFingerprint(input: unknown) {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}
