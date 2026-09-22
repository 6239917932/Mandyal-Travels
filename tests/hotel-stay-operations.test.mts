import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  availablePhysicalRooms,
  evaluateStayTiming,
  evaluateStayTransition,
  normalizeRoomAssignments,
} from '../lib/hotel/stayOperations.ts';

test('future arrivals cannot be checked in or marked no-show', () => {
  assert.equal(
    evaluateStayTiming({
      checkInDate: '2026-10-18',
      checkOutDate: '2026-10-21',
      operationalDate: '2026-10-17',
      nextStatus: 'CHECKED_IN',
    })?.code,
    'ARRIVAL_NOT_DUE',
  );
  assert.equal(
    evaluateStayTiming({
      checkInDate: '2026-10-18',
      checkOutDate: '2026-10-21',
      operationalDate: '2026-10-17',
      nextStatus: 'NO_SHOW',
    })?.code,
    'ARRIVAL_NOT_DUE',
  );
});

test('a lagging operational date directs staff to night audit instead of blaming timezone', () => {
  const violation = evaluateStayTiming({
    calendarDate: '2026-09-21',
    checkInDate: '2026-09-21',
    checkOutDate: '2026-09-22',
    operationalDate: '2026-09-20',
    nextStatus: 'CHECKED_IN',
  });
  assert.equal(violation?.code, 'OPERATIONAL_DATE_BEHIND');
  assert.match(violation?.message ?? '', /Complete night audit/);
  assert.match(violation?.message ?? '', /2026-09-20/);
});

test('expired stays cannot be checked in', () => {
  assert.equal(
    evaluateStayTiming({
      checkInDate: '2026-10-18',
      checkOutDate: '2026-10-21',
      operationalDate: '2026-10-21',
      nextStatus: 'CHECKED_IN',
    })?.code,
    'STAY_DATE_PASSED',
  );
});

test('stay transitions allow only reserved arrival outcomes and checked-in checkout', () => {
  assert.equal(evaluateStayTransition('RESERVED', 'CHECKED_IN'), undefined);
  assert.equal(evaluateStayTransition('RESERVED', 'NO_SHOW'), undefined);
  assert.equal(evaluateStayTransition('CHECKED_IN', 'CHECKED_OUT'), undefined);
  assert.equal(evaluateStayTransition('RESERVED', 'CHECKED_OUT')?.code, 'INVALID_STAY_TRANSITION');
  assert.equal(
    evaluateStayTransition('CHECKED_OUT', 'CHECKED_IN')?.code,
    'INVALID_STAY_TRANSITION',
  );
});

test('room assignments are normalized, unique, bounded and exact', () => {
  assert.deepEqual(normalizeRoomAssignments([' 204 ', '205'], 2), { roomNumbers: ['204', '205'] });
  assert.deepEqual(normalizeRoomAssignments(['A.1', 'A_1'], 2), { roomNumbers: ['A.1', 'A_1'] });
  assert.equal(
    normalizeRoomAssignments(['204', '204'], 2).violation?.code,
    'INVALID_ROOM_ASSIGNMENT',
  );
  assert.equal(normalizeRoomAssignments(['#204'], 1).violation?.code, 'INVALID_ROOM_ASSIGNMENT');
  assert.equal(normalizeRoomAssignments(['204'], 2).violation?.code, 'INVALID_ROOM_ASSIGNMENT');
});

test('front desk sees only ready, active and unoccupied rooms', () => {
  const rooms = [
    { housekeepingStatus: 'READY', operationalStatus: 'ACTIVE', roomNumber: '101' },
    { housekeepingStatus: 'DIRTY', operationalStatus: 'ACTIVE', roomNumber: '102' },
    { housekeepingStatus: 'READY', operationalStatus: 'OUT_OF_SERVICE', roomNumber: '103' },
    { housekeepingStatus: 'READY', operationalStatus: 'ACTIVE', roomNumber: '104' },
  ];
  assert.deepEqual(
    availablePhysicalRooms(rooms, new Set(['104'])).map((room) => room.roomNumber),
    ['101'],
  );
});

test('stay mutations reject a stale status before writing checkout side effects', async () => {
  const service = await readFile(
    new URL('../services/partnerOperationsService.ts', import.meta.url),
    'utf8',
  );
  const change = service.indexOf('const changed = await transaction.booking.updateMany');
  const conflict = service.indexOf("'STAY_VERSION_CONFLICT'", change);
  const dirtyRooms = service.indexOf('transaction.partnerPhysicalRoom.updateMany', change);
  const audit = service.indexOf('action: `HOTEL_STAY_${nextStatus}`', change);

  assert.ok(change >= 0);
  assert.match(
    service.slice(change, conflict),
    /operationalStatus: booking\.operationalStatus[\s\S]*status: 'confirmed'/,
  );
  assert.ok(conflict > change);
  assert.ok(dirtyRooms > conflict);
  assert.ok(audit > conflict);
});
