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
