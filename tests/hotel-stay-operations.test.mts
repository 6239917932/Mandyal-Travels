import assert from 'node:assert/strict';
import test from 'node:test';

import {
  availablePhysicalRooms,
  evaluateStayTiming,
  evaluateStayTransition,
  normalizeRoomAssignments,
} from '../lib/hotel/stayOperations.ts';

test('future arrivals cannot be checked in or marked no-show', () => {
  assert.equal(evaluateStayTiming({ checkInDate: '2026-10-18', checkOutDate: '2026-10-21', localDate: '2026-10-17', nextStatus: 'CHECKED_IN' })?.code, 'ARRIVAL_NOT_DUE');
  assert.equal(evaluateStayTiming({ checkInDate: '2026-10-18', checkOutDate: '2026-10-21', localDate: '2026-10-17', nextStatus: 'NO_SHOW' })?.code, 'ARRIVAL_NOT_DUE');
});

test('expired stays cannot be checked in', () => {
  assert.equal(evaluateStayTiming({ checkInDate: '2026-10-18', checkOutDate: '2026-10-21', localDate: '2026-10-21', nextStatus: 'CHECKED_IN' })?.code, 'STAY_DATE_PASSED');
});

test('stay transitions allow only reserved arrival outcomes and checked-in checkout', () => {
  assert.equal(evaluateStayTransition('RESERVED', 'CHECKED_IN'), undefined);
  assert.equal(evaluateStayTransition('RESERVED', 'NO_SHOW'), undefined);
  assert.equal(evaluateStayTransition('CHECKED_IN', 'CHECKED_OUT'), undefined);
  assert.equal(evaluateStayTransition('RESERVED', 'CHECKED_OUT')?.code, 'INVALID_STAY_TRANSITION');
  assert.equal(evaluateStayTransition('CHECKED_OUT', 'CHECKED_IN')?.code, 'INVALID_STAY_TRANSITION');
});

test('room assignments are normalized, unique, bounded and exact', () => {
  assert.deepEqual(normalizeRoomAssignments([' 204 ', '205'], 2), { roomNumbers: ['204', '205'] });
  assert.equal(normalizeRoomAssignments(['204', '204'], 2).violation?.code, 'INVALID_ROOM_ASSIGNMENT');
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
