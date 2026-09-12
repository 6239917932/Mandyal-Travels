import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeManagedInventoryRecords } from '../lib/pms/managedInventoryProjection.ts';

test('private managed PMS rooms remain operable without public hotel inventory', () => {
  assert.deepEqual(
    mergeManagedInventoryRecords(
      [],
      [
        {
          hotelName: 'Private Trial Hotel',
          inventoryCount: 5,
          roomName: 'Deluxe',
          roomTypeId: 'private-deluxe',
        },
      ],
      [],
    ),
    [
      {
        activeHolds: 0,
        allocatedRooms: 0,
        baseInventory: 5,
        effectiveInventory: 5,
        hotelName: 'Private Trial Hotel',
        inventorySource: 'MANAGED_PMS',
        overrideApplied: false,
        remainingRooms: 5,
        roomName: 'Deluxe',
        roomTypeId: 'private-deluxe',
      },
    ],
  );
});

test('private PMS projection applies the most restrictive daily control', () => {
  const [record] = mergeManagedInventoryRecords(
    [],
    [
      {
        hotelName: 'Private Trial Hotel',
        inventoryCount: 5,
        roomName: 'Deluxe',
        roomTypeId: 'private-deluxe',
      },
    ],
    [
      { availableRooms: 3, roomTypeId: 'private-deluxe', stopSell: false },
      { availableRooms: 5, roomTypeId: 'private-deluxe', stopSell: true },
    ],
  );
  assert.equal(record?.effectiveInventory, 0);
  assert.equal(record?.remainingRooms, 0);
  assert.equal(record?.overrideApplied, true);
});

test('public allocation evidence is retained instead of duplicated', () => {
  const publicRecord = {
    activeHolds: 1,
    allocatedRooms: 2,
    baseInventory: 5,
    effectiveInventory: 4,
    hotelName: 'Published Hotel',
    inventorySource: 'DIRECT',
    overrideApplied: true,
    remainingRooms: 1,
    roomName: 'Deluxe',
    roomTypeId: 'shared-room',
  };
  assert.deepEqual(
    mergeManagedInventoryRecords(
      [publicRecord],
      [
        {
          hotelName: 'Published Hotel',
          inventoryCount: 5,
          roomName: 'Deluxe',
          roomTypeId: 'shared-room',
        },
      ],
      [],
    ),
    [publicRecord],
  );
});
