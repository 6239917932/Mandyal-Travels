import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAttendantQueue } from '../lib/pms/attendantView.ts';
import { getPmsModule } from '../lib/pms/moduleRegistry.ts';

function room(
  id: string,
  roomNumber: string,
  housekeepingStatus: string,
  operationalStatus = 'ACTIVE',
) {
  return {
    floorLabel: 'First',
    housekeepingInspections: [],
    housekeepingStatus,
    id,
    notes: '',
    operationalStatus,
    property: { displayName: 'Test Hotel' },
    propertyId: 'property-1',
    roomNumber,
    roomType: { name: 'Deluxe' },
    roomTypeId: 'room-type-1',
  };
}

test('attendant queue prioritizes unsafe and actionable rooms deterministically', () => {
  const queue = buildAttendantQueue(
    [
      room('ready', '10', 'READY'),
      room('dirty', '2', 'DIRTY'),
      room('offline', '1', 'READY', 'OUT_OF_SERVICE'),
      room('urgent', '3', 'READY'),
    ],
    [
      { physicalRoomId: 'urgent', priority: 'URGENT', status: 'OPEN' },
      { physicalRoomId: 'ready', priority: 'URGENT', status: 'RESOLVED' },
    ],
  );

  assert.deepEqual(
    queue.map((entry) => [entry.id, entry.queueState]),
    [
      ['offline', 'OUT_OF_SERVICE'],
      ['urgent', 'URGENT_MAINTENANCE'],
      ['dirty', 'DIRTY'],
      ['ready', 'READY'],
    ],
  );
  assert.equal(queue.find((entry) => entry.id === 'ready')?.activeWorkOrders, 0);
});

test('attendant queue treats unknown persisted states as requiring review', () => {
  const [entry] = buildAttendantQueue([room('unknown', '20', 'UNKNOWN')], []);
  assert.equal(entry?.queueState, 'NEEDS_REVIEW');
});

test('attendant view is registered as a live PMS destination', () => {
  const attendantModule = getPmsModule('AT');
  assert.equal(attendantModule?.status, 'LIVE');
  assert.equal(attendantModule?.href, '/partner/pms/attendant');
});
