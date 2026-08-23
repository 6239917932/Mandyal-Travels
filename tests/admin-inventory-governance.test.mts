import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adminInventoryPath,
  assessAdminInventory,
  normalizeAdminInventoryFilters,
} from '../services/adminInventoryGovernanceService.ts';

const baseDay = {
  availableRooms: 4,
  closedToArrival: false,
  closedToDeparture: false,
  maximumStayNights: null,
  minimumStayNights: null,
  stayDate: '2026-08-24',
  stopSell: false,
};

test('administrator inventory filters accept only bounded catalogue values', () => {
  assert.deepEqual(
    normalizeAdminInventoryFilters({
      horizon: '90',
      page: '3',
      q: `  ${'hotel '.repeat(30)}  `,
      state: 'stop_sell',
    }),
    {
      horizon: 90,
      page: 3,
      query: 'hotel '.repeat(30).trim().slice(0, 100),
      state: 'STOP_SELL',
    },
  );
  assert.deepEqual(
    normalizeAdminInventoryFilters({ horizon: '365', page: '-4', state: 'unsafe' }),
    {
      horizon: 30,
      page: 1,
      query: '',
      state: 'ALL',
    },
  );
});

test('inventory governance reports missing rates and impossible capacity first', () => {
  assert.equal(
    assessAdminInventory({ activeRatePlans: 0, baseInventory: 4, days: [baseDay] }).health,
    'RATE_MISSING',
  );
  const capacity = assessAdminInventory({
    activeRatePlans: 1,
    baseInventory: 4,
    days: [{ ...baseDay, availableRooms: 5 }],
  });
  assert.equal(capacity.health, 'CAPACITY_ISSUE');
  assert.equal(capacity.capacityIssueDates, 1);
});

test('inventory governance distinguishes stop-sells, restrictions, and on-sale rooms', () => {
  const stopSell = assessAdminInventory({
    activeRatePlans: 1,
    baseInventory: 4,
    days: [{ ...baseDay, availableRooms: 0, stopSell: true }],
  });
  assert.equal(stopSell.health, 'STOP_SELL');
  assert.equal(stopSell.soldOutDates, 1);
  assert.equal(stopSell.stopSellDates, 1);
  assert.equal(
    assessAdminInventory({
      activeRatePlans: 1,
      baseInventory: 4,
      days: [{ ...baseDay, availableRooms: 0 }],
    }).health,
    'SOLD_OUT',
  );
  assert.equal(
    assessAdminInventory({
      activeRatePlans: 1,
      baseInventory: 4,
      days: [{ ...baseDay, minimumStayNights: 2 }],
    }).health,
    'RESTRICTED',
  );
  assert.equal(
    assessAdminInventory({ activeRatePlans: 1, baseInventory: 4, days: [] }).health,
    'ON_SALE',
  );
});

test('inventory pagination preserves normalized active filters', () => {
  const filters = normalizeAdminInventoryFilters({
    horizon: '7',
    q: 'Shimla',
    state: 'restricted',
  });
  assert.equal(
    adminInventoryPath(filters, 2),
    '/admin/inventory?page=2&q=Shimla&state=RESTRICTED&horizon=7',
  );
});
