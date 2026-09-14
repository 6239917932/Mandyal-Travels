import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  normalizeStockItem,
  normalizeStockLocation,
  normalizeStockLotReceipt,
  normalizeStockLotTransfer,
  normalizeStockMovement,
  normalizeStockWastage,
  normalizeStockWastageReversal,
  stockExpiryPosture,
  stockMovementDelta,
} from '../lib/pms/stockInventory.ts';

test('stock item and movement inputs are closed and bounded', () => {
  assert.deepEqual(
    normalizeStockItem({
      category: 'linen',
      name: 'Bath towel',
      quantityOnHand: 20,
      reorderLevel: 5,
      sku: ' tw-01 ',
      unit: 'item',
    }),
    {
      category: 'LINEN',
      name: 'Bath towel',
      quantityOnHand: 20,
      reorderLevel: 5,
      sku: 'TW-01',
      unit: 'ITEM',
    },
  );
  assert.equal(
    normalizeStockItem({
      category: 'unknown',
      name: 'X',
      quantityOnHand: -1,
      reorderLevel: 0,
      sku: 'x',
      unit: 'item',
    }),
    null,
  );
  assert.deepEqual(
    normalizeStockMovement({
      expectedVersion: 2,
      itemId: 'item-1',
      movementType: 'issue',
      note: 'Room usage',
      quantity: 3,
    }),
    {
      expectedVersion: 2,
      itemId: 'item-1',
      movementType: 'ISSUE',
      note: 'Room usage',
      quantity: 3,
    },
  );
  assert.equal(stockMovementDelta('RECEIPT', 4), 4);
  assert.equal(stockMovementDelta('ISSUE', 4), -4);
});

test('stock locations, expiry batches, transfers, and wastage inputs are closed and bounded', () => {
  assert.deepEqual(
    normalizeStockLocation({
      code: ' main-1 ',
      kind: 'store',
      name: 'Main Store',
      propertyId: 'property-1',
    }),
    { code: 'MAIN-1', kind: 'STORE', name: 'Main Store', propertyId: 'property-1' },
  );
  assert.deepEqual(
    normalizeStockLotReceipt({
      expectedItemVersion: 2,
      expiryDate: '2027-01-31',
      itemId: 'item-1',
      locationId: 'location-1',
      lotCode: ' batch-7 ',
      note: 'Supplier invoice 77',
      quantity: 12,
    }),
    {
      eventType: 'RECEIPT',
      expectedItemVersion: 2,
      expiryDate: '2027-01-31',
      itemId: 'item-1',
      locationId: 'location-1',
      lotCode: 'BATCH-7',
      note: 'Supplier invoice 77',
      quantity: 12,
    },
  );
  assert.deepEqual(
    normalizeStockLotTransfer({
      expectedLotVersion: 3,
      fromLotId: 'lot-1',
      note: 'Move to pantry',
      quantity: 2,
      toLocationId: 'location-2',
    }),
    {
      eventType: 'TRANSFER',
      expectedLotVersion: 3,
      fromLotId: 'lot-1',
      note: 'Move to pantry',
      quantity: 2,
      toLocationId: 'location-2',
    },
  );
  assert.deepEqual(
    normalizeStockWastage({
      expectedItemVersion: 4,
      expectedLotVersion: 5,
      fromLotId: 'lot-1',
      note: 'Bottle damaged',
      quantity: 1,
    }),
    {
      eventType: 'WASTAGE',
      expectedItemVersion: 4,
      expectedLotVersion: 5,
      fromLotId: 'lot-1',
      note: 'Bottle damaged',
      quantity: 1,
    },
  );
  assert.deepEqual(
    normalizeStockWastageReversal({
      eventId: 'event-1',
      expectedItemVersion: 6,
      expectedLotVersion: 7,
      note: 'Incorrect entry',
    }),
    {
      eventId: 'event-1',
      eventType: 'WASTAGE_REVERSAL',
      expectedItemVersion: 6,
      expectedLotVersion: 7,
      note: 'Incorrect entry',
    },
  );
  assert.equal(
    normalizeStockLotReceipt({
      expectedItemVersion: 1,
      expiryDate: '31-01-2027',
      itemId: 'item',
      locationId: 'location',
      lotCode: 'lot',
      note: 'Valid note',
      quantity: 1,
    }),
    null,
  );
  assert.equal(stockExpiryPosture('2026-09-13', '2026-09-14'), 'EXPIRED');
  assert.equal(stockExpiryPosture('2026-10-01', '2026-09-14'), 'EXPIRING_SOON');
  assert.equal(stockExpiryPosture('', '2026-09-14'), 'NO_EXPIRY');
});

test('stock mutations are same-origin, scoped, retry-safe, audited, and append only', async () => {
  const [itemRoute, movementRoute, locationRoute, lotRoute, service, registry, schema] =
    await Promise.all([
      readFile(new URL('../app/api/v1/partner/stock-items/route.ts', import.meta.url), 'utf8'),
      readFile(new URL('../app/api/v1/partner/stock-movements/route.ts', import.meta.url), 'utf8'),
      readFile(new URL('../app/api/v1/partner/stock-locations/route.ts', import.meta.url), 'utf8'),
      readFile(new URL('../app/api/v1/partner/stock-lot-events/route.ts', import.meta.url), 'utf8'),
      readFile(new URL('../services/partnerStockInventoryService.ts', import.meta.url), 'utf8'),
      readFile(new URL('../lib/pms/moduleRegistry.ts', import.meta.url), 'utf8'),
      readFile(new URL('../prisma/schema.prisma', import.meta.url), 'utf8'),
    ]);
  assert.match(itemRoute, /isSameOriginMutation/);
  assert.match(itemRoute, /memberRole !== 'ADMIN'/);
  assert.match(itemRoute, /recordPartnerAudit/);
  assert.match(movementRoute, /x-idempotency-key/);
  assert.match(movementRoute, /recordPartnerAudit/);
  assert.match(locationRoute, /memberRole !== 'ADMIN'/);
  assert.match(locationRoute, /recordPartnerAudit/);
  assert.match(lotRoute, /x-idempotency-key/);
  assert.match(lotRoute, /memberRole !== 'ADMIN'/);
  assert.match(lotRoute, /recordPartnerAudit/);
  assert.match(service, /requestFingerprint/);
  assert.match(service, /Opening stock balance/);
  assert.match(service, /updateMany/);
  assert.match(service, /STALE_STOCK_ITEM/);
  assert.match(service, /INSUFFICIENT_STOCK/);
  assert.doesNotMatch(service, /hotelStockMovement\.(?:update|delete)/);
  assert.doesNotMatch(service, /hotelStockLotEvent\.(?:update|delete)/);
  assert.match(service, /WASTAGE_ALREADY_REVERSED/);
  assert.match(service, /SAME_STOCK_LOCATION/);
  assert.match(service, /LOT_EXPIRY_CONFLICT/);
  assert.match(schema, /model HotelStockLocation/);
  assert.match(schema, /model HotelStockLot/);
  assert.match(schema, /model HotelStockLotEvent/);
  assert.match(schema, /reversalOfId\s+String\?\s+@unique/);
  assert.match(
    registry,
    /href: '\/partner\/pms\/stock'[\s\S]*name: 'Stock and inventory'[\s\S]*status: 'LIVE'/,
  );
});
