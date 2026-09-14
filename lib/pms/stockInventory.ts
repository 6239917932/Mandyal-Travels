import { createHash } from 'node:crypto';

import {
  HOTEL_STOCK_CATEGORIES,
  HOTEL_STOCK_MOVEMENTS,
  HOTEL_STOCK_UNITS,
} from './stockInventoryCatalog.ts';

export { HOTEL_STOCK_CATEGORIES, HOTEL_STOCK_MOVEMENTS, HOTEL_STOCK_UNITS };

const clean = (value: unknown, maximum: number) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maximum) : '';

function positiveInteger(value: unknown, maximum = 1_000_000) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maximum ? parsed : null;
}

function nonNegativeInteger(value: unknown, maximum = 1_000_000) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= maximum ? parsed : null;
}

const identifier = (value: unknown, maximum = 100) => clean(value, maximum);
const code = (value: unknown, maximum = 40) =>
  clean(value, maximum)
    .toUpperCase()
    .replace(/[^A-Z0-9._-]/g, '');
const isoDate = (value: unknown) => {
  const date = clean(value, 10);
  return date === '' || /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
};

export function normalizeStockItem(input: Record<string, unknown>) {
  const name = clean(input.name, 100);
  const sku = clean(input.sku, 40)
    .toUpperCase()
    .replace(/[^A-Z0-9._-]/g, '');
  const category = clean(input.category, 30).toUpperCase();
  const unit = clean(input.unit, 20).toUpperCase();
  const quantityOnHand = nonNegativeInteger(input.quantityOnHand);
  const reorderLevel = nonNegativeInteger(input.reorderLevel);
  if (
    name.length < 2 ||
    sku.length < 2 ||
    !HOTEL_STOCK_CATEGORIES.includes(category as (typeof HOTEL_STOCK_CATEGORIES)[number]) ||
    !HOTEL_STOCK_UNITS.includes(unit as (typeof HOTEL_STOCK_UNITS)[number]) ||
    quantityOnHand === null ||
    reorderLevel === null
  ) {
    return null;
  }
  return { category, name, quantityOnHand, reorderLevel, sku, unit };
}

export function normalizeStockMovement(input: Record<string, unknown>) {
  const itemId = clean(input.itemId, 100);
  const movementType = clean(input.movementType, 30).toUpperCase();
  const note = clean(input.note, 300);
  const quantity = positiveInteger(input.quantity);
  const expectedVersion = nonNegativeInteger(input.expectedVersion);
  if (
    !itemId ||
    !HOTEL_STOCK_MOVEMENTS.includes(movementType as (typeof HOTEL_STOCK_MOVEMENTS)[number]) ||
    note.length < 5 ||
    quantity === null ||
    expectedVersion === null
  ) {
    return null;
  }
  return { expectedVersion, itemId, movementType, note, quantity };
}

export function stockMovementDelta(movementType: string, quantity: number) {
  return movementType === 'RECEIPT' || movementType === 'ADJUSTMENT_IN' ? quantity : -quantity;
}

export function stockRequestFingerprint(input: unknown) {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

export function normalizeStockLocation(input: Record<string, unknown>) {
  const propertyId = identifier(input.propertyId);
  const locationCode = code(input.code, 30);
  const name = clean(input.name, 100);
  const kind = clean(input.kind, 20).toUpperCase();
  if (
    !propertyId ||
    locationCode.length < 2 ||
    name.length < 2 ||
    !['STORE', 'PANTRY', 'KITCHEN', 'HOUSEKEEPING'].includes(kind)
  )
    return null;
  return { code: locationCode, kind, name, propertyId };
}

export function normalizeStockLotReceipt(input: Record<string, unknown>) {
  const itemId = identifier(input.itemId);
  const locationId = identifier(input.locationId);
  const lotCode = code(input.lotCode, 50);
  const expiryDate = isoDate(input.expiryDate);
  const note = clean(input.note, 300);
  const quantity = positiveInteger(input.quantity);
  const expectedItemVersion = nonNegativeInteger(input.expectedItemVersion);
  if (
    !itemId ||
    !locationId ||
    lotCode.length < 2 ||
    expiryDate === null ||
    note.length < 5 ||
    quantity === null ||
    expectedItemVersion === null
  )
    return null;
  return {
    eventType: 'RECEIPT' as const,
    expectedItemVersion,
    expiryDate,
    itemId,
    locationId,
    lotCode,
    note,
    quantity,
  };
}

export function normalizeStockLotTransfer(input: Record<string, unknown>) {
  const fromLotId = identifier(input.fromLotId);
  const toLocationId = identifier(input.toLocationId);
  const note = clean(input.note, 300);
  const quantity = positiveInteger(input.quantity);
  const expectedLotVersion = nonNegativeInteger(input.expectedLotVersion);
  if (
    !fromLotId ||
    !toLocationId ||
    note.length < 5 ||
    quantity === null ||
    expectedLotVersion === null
  )
    return null;
  return {
    eventType: 'TRANSFER' as const,
    expectedLotVersion,
    fromLotId,
    note,
    quantity,
    toLocationId,
  };
}

export function normalizeStockWastage(input: Record<string, unknown>) {
  const fromLotId = identifier(input.fromLotId);
  const note = clean(input.note, 300);
  const quantity = positiveInteger(input.quantity);
  const expectedLotVersion = nonNegativeInteger(input.expectedLotVersion);
  const expectedItemVersion = nonNegativeInteger(input.expectedItemVersion);
  if (
    !fromLotId ||
    note.length < 5 ||
    quantity === null ||
    expectedLotVersion === null ||
    expectedItemVersion === null
  )
    return null;
  return {
    eventType: 'WASTAGE' as const,
    expectedItemVersion,
    expectedLotVersion,
    fromLotId,
    note,
    quantity,
  };
}

export function normalizeStockWastageReversal(input: Record<string, unknown>) {
  const eventId = identifier(input.eventId);
  const note = clean(input.note, 300);
  const expectedLotVersion = nonNegativeInteger(input.expectedLotVersion);
  const expectedItemVersion = nonNegativeInteger(input.expectedItemVersion);
  if (!eventId || note.length < 5 || expectedLotVersion === null || expectedItemVersion === null)
    return null;
  return {
    eventId,
    eventType: 'WASTAGE_REVERSAL' as const,
    expectedItemVersion,
    expectedLotVersion,
    note,
  };
}

export function stockExpiryPosture(expiryDate: string, today: string) {
  if (!expiryDate) return 'NO_EXPIRY' as const;
  if (expiryDate < today) return 'EXPIRED' as const;
  const expiry = Date.parse(`${expiryDate}T00:00:00Z`);
  const current = Date.parse(`${today}T00:00:00Z`);
  return expiry - current <= 30 * 86_400_000 ? ('EXPIRING_SOON' as const) : ('CURRENT' as const);
}
