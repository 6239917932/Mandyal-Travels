import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  normalizeHousekeepingInspection,
  normalizeMaintenanceTransition,
  normalizeMaintenanceWorkOrder,
  requireRoomOperationIdempotencyKey,
} from '../lib/pms/housekeepingMaintenance.ts';

test('housekeeping inspection validation requires evidence for a failed check', () => {
  assert.deepEqual(normalizeHousekeepingInspection({ result: 'passed' }), {
    note: '',
    result: 'PASSED',
  });
  assert.throws(
    () => normalizeHousekeepingInspection({ note: 'bad', result: 'FAILED' }),
    /at least eight characters/,
  );
  assert.equal(
    normalizeHousekeepingInspection({ note: 'Bathroom seal is leaking', result: 'FAILED' }).result,
    'FAILED',
  );
});

test('maintenance validation uses closed categories, priorities and terminal transitions', () => {
  assert.deepEqual(
    normalizeMaintenanceWorkOrder({
      category: 'plumbing',
      description: ' Basin pipe is leaking ',
      priority: 'high',
      summary: 'Leaking basin',
    }),
    {
      category: 'PLUMBING',
      description: 'Basin pipe is leaking',
      priority: 'HIGH',
      summary: 'Leaking basin',
    },
  );
  assert.equal(
    normalizeMaintenanceTransition({ currentStatus: 'OPEN', nextStatus: 'IN_PROGRESS' }).nextStatus,
    'IN_PROGRESS',
  );
  assert.throws(
    () => normalizeMaintenanceTransition({ currentStatus: 'RESOLVED', nextStatus: 'OPEN' }),
    /not allowed/,
  );
  assert.throws(
    () => normalizeMaintenanceTransition({ currentStatus: 'OPEN', nextStatus: 'RESOLVED' }),
    /at least eight characters/,
  );
});

test('room-operation retry keys are bounded and maintenance routes enforce origin and ownership', async () => {
  assert.equal(
    requireRoomOperationIdempotencyKey('123e4567-e89b-42d3-a456-426614174000').length,
    36,
  );
  assert.throws(() => requireRoomOperationIdempotencyKey('short'));
  const [createRoute, updateRoute, inspectionRoute, service, roomService, registry] =
    await Promise.all([
      readFile(
        new URL('../app/api/v1/partner/maintenance-work-orders/route.ts', import.meta.url),
        'utf8',
      ),
      readFile(
        new URL(
          '../app/api/v1/partner/maintenance-work-orders/[workOrderId]/route.ts',
          import.meta.url,
        ),
        'utf8',
      ),
      readFile(
        new URL(
          '../app/api/v1/partner/physical-rooms/[physicalRoomId]/inspections/route.ts',
          import.meta.url,
        ),
        'utf8',
      ),
      readFile(
        new URL('../services/partnerHousekeepingMaintenanceService.ts', import.meta.url),
        'utf8',
      ),
      readFile(new URL('../services/partnerOperationsService.ts', import.meta.url), 'utf8'),
      readFile(new URL('../lib/pms/moduleRegistry.ts', import.meta.url), 'utf8'),
    ]);
  for (const route of [createRoute, updateRoute, inspectionRoute]) {
    assert.match(route, /isSameOriginMutation\(request\)/);
    assert.match(route, /access\.partnerId/);
    assert.match(route, /access\.userId/);
  }
  assert.match(service, /isolationLevel: 'Serializable'/);
  assert.match(service, /operationalStatus: 'OUT_OF_SERVICE'/);
  assert.match(service, /HOTEL_ROOM_INSPECTED/);
  assert.match(roomService, /MAINTENANCE_UNRESOLVED/);
  assert.match(roomService, /FRESH_INSPECTION_REQUIRED/);
  assert.match(registry, /href: '\/partner\/pms\/maintenance'/);
});
