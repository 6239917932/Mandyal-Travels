import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  normalizeStockItem,
  normalizeStockMovement,
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

test('stock mutations are same-origin, scoped, retry-safe, audited, and append only', async () => {
  const [itemRoute, movementRoute, service, registry] = await Promise.all([
    readFile(new URL('../app/api/v1/partner/stock-items/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/api/v1/partner/stock-movements/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../services/partnerStockInventoryService.ts', import.meta.url), 'utf8'),
    readFile(new URL('../lib/pms/moduleRegistry.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(itemRoute, /isSameOriginMutation/);
  assert.match(itemRoute, /memberRole !== 'ADMIN'/);
  assert.match(itemRoute, /recordPartnerAudit/);
  assert.match(movementRoute, /x-idempotency-key/);
  assert.match(movementRoute, /recordPartnerAudit/);
  assert.match(service, /requestFingerprint/);
  assert.match(service, /Opening stock balance/);
  assert.match(service, /updateMany/);
  assert.match(service, /STALE_STOCK_ITEM/);
  assert.match(service, /INSUFFICIENT_STOCK/);
  assert.doesNotMatch(service, /hotelStockMovement\.(?:update|delete)/);
  assert.match(
    registry,
    /href: '\/partner\/pms\/stock'[\s\S]*name: 'Stock and inventory'[\s\S]*status: 'LIVE'/,
  );
});
