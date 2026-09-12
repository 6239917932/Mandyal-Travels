import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { channelConnectionReadiness } from '../lib/hotel/channelRules.ts';
import { buildOutletPerformance, calculateBookingPace } from '../lib/pms/ownerOverview.ts';

test('channel dispatch requires an active connection with a recent healthy check', () => {
  const now = new Date('2026-09-08T12:00:00.000Z');
  assert.equal(
    channelConnectionReadiness({
      lastHealthAt: '2026-09-08T11:00:00.000Z',
      lastHealthStatus: 'HEALTHY',
      now,
      status: 'ACTIVE',
    }).ready,
    true,
  );
  assert.equal(
    channelConnectionReadiness({
      lastHealthAt: '2026-09-07T11:59:59.000Z',
      lastHealthStatus: 'HEALTHY',
      now,
      status: 'ACTIVE',
    }).code,
    'CHANNEL_HEALTH_STALE',
  );
  assert.equal(
    channelConnectionReadiness({
      lastHealthAt: null,
      lastHealthStatus: 'NOT_CHECKED',
      now,
      status: 'PENDING_CONFIGURATION',
    }).code,
    'CHANNEL_NOT_ACTIVE',
  );
});

test('revenue helpers calculate bounded recorded booking pace and posted outlet totals', () => {
  assert.deepEqual(
    calculateBookingPace({
      bookings: [
        {
          checkInDate: '2026-09-20',
          createdAt: '2026-09-08T06:00:00.000Z',
          rooms: 2,
          totalAmount: 800,
        },
        {
          checkInDate: '2026-09-21',
          createdAt: '2026-08-29T06:00:00.000Z',
          rooms: 1,
          totalAmount: 400,
        },
        {
          checkInDate: '2026-10-30',
          createdAt: '2026-09-08T06:00:00.000Z',
          rooms: 9,
          totalAmount: 9_000,
        },
      ],
      businessDate: '2026-09-08',
    }),
    {
      currentBookings: 1,
      currentRooms: 2,
      currentValue: 800,
      previousBookings: 1,
      previousRooms: 1,
      previousValue: 400,
    },
  );
  assert.deepEqual(
    buildOutletPerformance([
      { outletName: 'Restaurant', serviceMode: 'DINE_IN', status: 'POSTED', totalAmount: 500 },
      { outletName: 'Restaurant', serviceMode: 'DINE_IN', status: 'CANCELLED', totalAmount: 900 },
      { outletName: '', serviceMode: 'ROOM_SERVICE', status: 'POSTED', totalAmount: 300 },
    ]),
    [
      { orders: 1, outlet: 'Restaurant', postedValue: 500 },
      { orders: 1, outlet: 'ROOM_SERVICE', postedValue: 300 },
    ],
  );
});

test('channel mutations are scoped, origin protected, readiness gated and audited atomically', async () => {
  const [connection, mapping, dispatch, reconciliation, page, manager, outbox, registry] =
    await Promise.all([
      readFile(new URL('../app/api/v1/partner/channels/route.ts', import.meta.url), 'utf8'),
      readFile(
        new URL('../app/api/v1/partner/channels/mappings/route.ts', import.meta.url),
        'utf8',
      ),
      readFile(new URL('../app/api/v1/partner/channels/syncs/route.ts', import.meta.url), 'utf8'),
      readFile(
        new URL('../app/api/v1/partner/channels/syncs/[syncRunId]/route.ts', import.meta.url),
        'utf8',
      ),
      readFile(new URL('../app/partner/channels/page.tsx', import.meta.url), 'utf8'),
      readFile(new URL('../components/partner/ChannelSyncManager.tsx', import.meta.url), 'utf8'),
      readFile(new URL('../services/integrationOutboxService.ts', import.meta.url), 'utf8'),
      readFile(new URL('../lib/pms/moduleRegistry.ts', import.meta.url), 'utf8'),
    ]);
  for (const route of [connection, mapping, dispatch, reconciliation]) {
    assert.match(route, /isSameOriginMutation\(request\)/);
    assert.match(route, /access\.memberRole !== 'ADMIN'/);
  }
  assert.match(dispatch, /channelConnectionReadiness\(connection\)/);
  assert.match(dispatch, /status: \{ in: \['QUEUED', 'PROCESSING'\] \}/);
  assert.match(dispatch, /isolationLevel: 'Serializable'/);
  assert.match(reconciliation, /updateMany/);
  assert.match(reconciliation, /where: \{ id: run\.id, status: run\.status \}/);
  assert.match(connection, /transaction\.partnerAuditLog\.create/);
  assert.match(mapping, /transaction\.partnerAuditLog\.create/);
  assert.match(dispatch, /transaction\.partnerAuditLog\.create/);
  assert.match(reconciliation, /transaction\.partnerAuditLog\.create/);
  assert.match(page, /Distribution command centre/);
  assert.match(manager, /PMS-ONLY · MANUAL MODE/);
  assert.match(manager, /No automatic OTA transmission/);
  assert.match(manager, /Export channel action sheet/);
  assert.match(manager, /canAdminister/);
  assert.match(outbox, /setChannelSyncRunStatus\(transaction, event, 'DISPATCHED'\)/);
  assert.match(
    registry,
    /code: 'OE'[\s\S]*href: '\/partner\/pms\/owner-overview'[\s\S]*status: 'LIVE'/,
  );
});
