import { createHash } from 'node:crypto';

export const HOTEL_RESTAURANT_ENTITY_TYPES = ['OUTLET', 'TABLE', 'MENU_ITEM'] as const;
export type HotelRestaurantEntityType = (typeof HOTEL_RESTAURANT_ENTITY_TYPES)[number];

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

export function restaurantCatalogFingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
