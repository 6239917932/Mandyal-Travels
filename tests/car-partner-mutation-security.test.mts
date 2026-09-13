import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const mutationRoutes = [
  '../app/api/v1/partner/vehicles/route.ts',
  '../app/api/v1/partner/vehicles/[vehicleId]/route.ts',
  '../app/api/v1/partner/vehicles/[vehicleId]/availability/route.ts',
  '../app/api/v1/partner/vehicles/[vehicleId]/compliance/route.ts',
  '../app/api/v1/partner/vehicles/[vehicleId]/maintenance/route.ts',
  '../app/api/v1/partner/reservations/[confirmationCode]/route.ts',
];

test('browser-based car supplier mutations reject cross-origin requests', async () => {
  for (const route of mutationRoutes) {
    const source = await readFile(new URL(route, import.meta.url), 'utf8');
    assert.match(source, /isSameOriginMutation/);
    assert.match(source, /access\.mode !== 'integration-key' && !isSameOriginMutation\(request\)/);
    assert.match(source, /FORBIDDEN_ORIGIN/);
  }
});
