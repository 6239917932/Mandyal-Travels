import { createHash } from 'node:crypto';

export const HOTEL_RESTAURANT_ENTITY_TYPES = ['OUTLET', 'TABLE', 'MENU_ITEM'] as const;
export type HotelRestaurantEntityType = (typeof HOTEL_RESTAURANT_ENTITY_TYPES)[number];
export const HOTEL_RESTAURANT_RESERVATION_STATUSES = [
  'BOOKED',
  'SEATED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const;

const codePattern = /^[A-Z0-9][A-Z0-9_-]{1,29}$/;

function text(value: unknown, maximum: number): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maximum) : '';
}

function id(value: unknown): string {
  return text(value, 80);
}

function whole(value: unknown, minimum: number, maximum: number): number | null {
  const result = Number(String(value ?? '').trim());
  return Number.isSafeInteger(result) && result >= minimum && result <= maximum ? result : null;
}

export function normalizeRestaurantOutlet(input: Record<string, unknown>) {
  const propertyId = id(input.propertyId);
  const outletCode = text(input.outletCode, 30).toUpperCase();
  const name = text(input.name, 100);
  const serviceArea = text(input.serviceArea, 100);
  if (!propertyId || !codePattern.test(outletCode) || name.length < 2) return null;
  return { name, outletCode, propertyId, serviceArea } as const;
}

export function normalizeRestaurantTable(input: Record<string, unknown>) {
  const outletId = id(input.outletId);
  const tableCode = text(input.tableCode, 30).toUpperCase();
  const capacity = whole(input.capacity, 1, 50);
  if (!outletId || !codePattern.test(tableCode) || capacity === null) return null;
  return { capacity, outletId, tableCode } as const;
}

export function normalizeRestaurantMenuItem(input: Record<string, unknown>) {
  const outletId = id(input.outletId);
  const category = text(input.category, 60);
  const name = text(input.name, 100);
  const description = text(input.description, 300);
  const unitPrice = whole(input.unitPrice, 1, 500_000);
  const vegetarian = input.vegetarian === true || input.vegetarian === 'on';
  if (!outletId || category.length < 2 || name.length < 2 || unitPrice === null) return null;
  return { category, description, name, outletId, unitPrice, vegetarian } as const;
}

export function normalizeRestaurantStatus(input: Record<string, unknown>) {
  const entityId = id(input.entityId);
  const entityType = text(input.entityType, 20).toUpperCase() as HotelRestaurantEntityType;
  const expectedVersion = whole(input.expectedVersion, 1, 1_000_000);
  const status = text(input.status, 30).toUpperCase();
  const note = text(input.note, 300);
  const allowed =
    entityType === 'TABLE'
      ? ['ACTIVE', 'OUT_OF_SERVICE']
      : entityType === 'OUTLET' || entityType === 'MENU_ITEM'
        ? ['ACTIVE', 'PAUSED']
        : [];
  if (!entityId || expectedVersion === null || !allowed.includes(status) || note.length < 8)
    return null;
  return { entityId, entityType, expectedVersion, note, status } as const;
}

export function normalizeRestaurantReservation(input: Record<string, unknown>, now = new Date()) {
  const tableId = id(input.tableId);
  const guestName = text(input.guestName, 100);
  const contactPhone = text(input.contactPhone, 30);
  const contactEmail = text(input.contactEmail, 160).toLowerCase();
  const partySize = whole(input.partySize, 1, 50);
  const durationMinutes = whole(input.durationMinutes, 30, 180);
  const notes = text(input.notes, 300);
  const startsAt = new Date(String(input.startsAt ?? ''));
  const latest = new Date(now.getTime() + 366 * 24 * 60 * 60 * 1_000);
  const validEmail = !contactEmail || /^\S+@\S+\.\S+$/.test(contactEmail);
  const validPhone = !contactPhone || /^[+0-9][0-9 ().-]{6,29}$/.test(contactPhone);
  if (
    !tableId ||
    guestName.length < 2 ||
    (!contactPhone && !contactEmail) ||
    !validEmail ||
    !validPhone ||
    partySize === null ||
    durationMinutes === null ||
    durationMinutes % 30 !== 0 ||
    Number.isNaN(startsAt.getTime()) ||
    startsAt.getUTCSeconds() !== 0 ||
    startsAt.getUTCMilliseconds() !== 0 ||
    startsAt.getUTCMinutes() % 30 !== 0 ||
    startsAt.getTime() < now.getTime() - 15 * 60 * 1_000 ||
    startsAt > latest
  )
    return null;
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1_000);
  return {
    contactEmail,
    contactPhone,
    durationMinutes,
    endsAt,
    guestName,
    notes,
    partySize,
    startsAt,
    tableId,
  } as const;
}

export function normalizeRestaurantReservationStatus(input: Record<string, unknown>) {
  const reservationId = id(input.reservationId);
  const expectedVersion = whole(input.expectedVersion, 1, 1_000_000);
  const status = text(input.status, 30).toUpperCase();
  const note = text(input.note, 300);
  if (
    !reservationId ||
    expectedVersion === null ||
    !HOTEL_RESTAURANT_RESERVATION_STATUSES.includes(
      status as (typeof HOTEL_RESTAURANT_RESERVATION_STATUSES)[number],
    ) ||
    note.length < 8
  )
    return null;
  return { expectedVersion, note, reservationId, status } as const;
}

export function restaurantReservationSlots(tableId: string, startsAt: Date, endsAt: Date) {
  const slots: Array<{ lockKey: string; slotStart: Date; tableId: string }> = [];
  for (let value = startsAt.getTime(); value < endsAt.getTime(); value += 30 * 60 * 1_000) {
    const slotStart = new Date(value);
    slots.push({ lockKey: `${tableId}:${slotStart.toISOString()}`, slotStart, tableId });
  }
  return slots;
}

export function restaurantCatalogFingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
