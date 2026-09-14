import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  assessRevenueDataQuality,
  buildRevenueDemandCalendar,
  buildRevenueReviewQueue,
  summarizeRevenueDemand,
} from '../lib/pms/revenueIntelligence.ts';

const bookings = [
  {
    checkInDate: '2026-09-14',
    checkOutDate: '2026-09-16',
    rooms: 4,
    totalAmount: 8_000,
  },
  {
    checkInDate: '2026-09-15',
    checkOutDate: '2026-09-17',
    rooms: 2,
    totalAmount: 6_000,
  },
] as const;

test('revenue demand calendar derives bounded forward occupancy and allocated value', () => {
  const calendar = buildRevenueDemandCalendar({
    activeRooms: 5,
    bookings,
    businessDate: '2026-09-14',
    horizonDays: 7,
  });
  assert.equal(calendar.length, 7);
  assert.deepEqual(calendar[0], {
    activeRooms: 5,
    adr: 1_000,
    bookedAccommodationValue: 4_000,
    businessDate: '2026-09-14',
    occupancyPercent: 80,
    oversoldRooms: 0,
    revPar: 800,
    roomsSold: 4,
  });
  assert.equal(calendar[1].roomsSold, 6);
  assert.equal(calendar[1].oversoldRooms, 1);
  assert.equal(calendar[1].occupancyPercent, 120);
  assert.deepEqual(summarizeRevenueDemand(calendar), {
    averageSevenDayOccupancy: 34,
    bookedRoomNights: 12,
    oversoldDates: 1,
    projectedBookedValue: 14_000,
  });
});

test('data sufficiency withholds pricing guidance for a new property', () => {
  assert.deepEqual(
    assessRevenueDataQuality({ activeRooms: 5, bookings, businessDate: '2026-09-14' }),
    {
      historicalBookings: 0,
      label: 'Insufficient history',
      message:
        'Current booked occupancy is available, but pricing guidance is withheld until at least 10 completed bookings across 7 departure dates exist.',
      observationDays: 0,
      quality: 'INSUFFICIENT',
    },
  );
});

test('review queue prioritizes overcapacity before high and low occupancy prompts', () => {
  const calendar = buildRevenueDemandCalendar({
    activeRooms: 5,
    bookings,
    businessDate: '2026-09-14',
    horizonDays: 7,
  });
  const queue = buildRevenueReviewQueue({ calendar, dataQuality: 'INSUFFICIENT' });
  assert.equal(queue[0].businessDate, '2026-09-15');
  assert.equal(queue[0].priority, 'CRITICAL');
  assert.match(queue[0].reason, /1 room above active capacity/);
  assert.ok(queue.some((item) => item.priority === 'REVIEW'));
});

test('revenue intelligence remains administrator-only and review-only in the workspace', async () => {
  const [page, registry, service] = await Promise.all([
    readFile(new URL('../app/partner/pms/revenue-intelligence/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../lib/pms/moduleRegistry.ts', import.meta.url), 'utf8'),
    readFile(new URL('../services/partnerOwnerOverviewService.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(page, /access\.memberRole !== 'ADMIN'/);
  assert.match(page, /Nothing on this page changes a rate/);
  assert.match(page, /competitor prices, events, scraped data or an external demand feed/);
  assert.match(registry, /href: '\/partner\/pms\/revenue-intelligence'/);
  assert.match(service, /buildRevenueDemandCalendar/);
  assert.match(service, /buildRevenueReviewQueue/);
});
