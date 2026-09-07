import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildRoomRackDates,
  readRoomRackAssignments,
  resolveRoomRackCell,
} from '../lib/pms/roomRack.ts';

const activeRoom = {
  housekeepingStatus: 'READY',
  operationalStatus: 'ACTIVE',
  roomNumber: '101',
};
const inHouse = {
  assignedRoomNumbers: ['101'],
  checkInDate: '2026-09-07',
  checkOutDate: '2026-09-10',
  confirmationCode: 'MT-ROOM-101',
  guestName: 'Test Guest',
  operationalStatus: 'CHECKED_IN',
};

test('room rack uses a bounded seven-day ISO date window', () => {
  assert.deepEqual(buildRoomRackDates('2026-09-07'), [
    '2026-09-07',
    '2026-09-08',
    '2026-09-09',
    '2026-09-10',
    '2026-09-11',
    '2026-09-12',
    '2026-09-13',
  ]);
  assert.deepEqual(buildRoomRackDates('not-a-date'), []);
  assert.deepEqual(buildRoomRackDates('2026-09-07', 15), []);
});

test('stored room assignments are normalized, deduplicated and fail closed', () => {
  assert.deepEqual(readRoomRackAssignments('[" 101 ","A.2","A_2","101","A-2"]'), [
    '101',
    'A.2',
    'A_2',
    'A-2',
  ]);
  assert.deepEqual(readRoomRackAssignments('{"room":"101"}'), []);
  assert.deepEqual(readRoomRackAssignments('not-json'), []);
});

test('room rack prioritizes controlled room downtime over booking projections', () => {
  const cell = resolveRoomRackCell(
    { ...activeRoom, operationalStatus: 'OUT_OF_SERVICE' },
    [inHouse],
    '2026-09-08',
    '2026-09-07',
  );
  assert.equal(cell.status, 'OUT_OF_SERVICE');
  assert.equal(cell.booking?.confirmationCode, inHouse.confirmationCode);
  assert.equal(cell.conflict, true);
});

test('room rack shows assigned stays only inside their half-open stay window', () => {
  assert.equal(
    resolveRoomRackCell(activeRoom, [inHouse], '2026-09-09', '2026-09-07').status,
    'OCCUPIED',
  );
  assert.equal(
    resolveRoomRackCell(activeRoom, [inHouse], '2026-09-10', '2026-09-07').status,
    'AVAILABLE',
  );
});

test('checked-in departures remain occupied on the operational date until checkout', () => {
  const departure = { ...inHouse, checkOutDate: '2026-09-07' };
  assert.equal(
    resolveRoomRackCell(activeRoom, [departure], '2026-09-07', '2026-09-07').status,
    'OCCUPIED',
  );
});

test('room rack flags impossible duplicate room assignments', () => {
  const cell = resolveRoomRackCell(
    activeRoom,
    [inHouse, { ...inHouse, confirmationCode: 'MT-ROOM-CONFLICT' }],
    '2026-09-08',
    '2026-09-07',
  );
  assert.equal(cell.status, 'OCCUPIED');
  assert.equal(cell.conflict, true);
});

test('room rack service and page preserve partner and property scope', async () => {
  const [service, page] = await Promise.all([
    readFile(new URL('../services/partnerPmsRoomRackService.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/partner/pms/room-rack/page.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(service, /where: \{ listingSource: 'MANAGED', partnerId, status: 'ACTIVE' \}/);
  assert.match(service, /where: \{ propertyId: selected\.id \}/);
  assert.match(service, /hotelSlug: selected\.hotelSlug/);
  assert.match(service, /checkOutDate: \{ gte: operationalDate \}/);
  assert.match(service, /take: MAX_RACK_PROPERTIES \+ 1/);
  assert.match(service, /take: MAX_RACK_ROOMS \+ 1/);
  assert.match(service, /take: MAX_RACK_BOOKINGS \+ 1/);
  assert.match(page, /getPartnerAccess\(\)/);
  assert.match(page, /access\.partnerType !== 'HOTEL'/);
  assert.doesNotMatch(page, /email|phone/i);
});
