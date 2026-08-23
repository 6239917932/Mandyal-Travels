import assert from 'node:assert/strict';
import test from 'node:test';

import { canManageFlightConnections } from '../lib/partner/permissions.ts';

test('only flight supplier administrators can manage credential references', () => {
  assert.equal(
    canManageFlightConnections({
      memberRole: 'ADMIN',
      partnerId: 'flight-1',
      partnerType: 'FLIGHT',
    }),
    true,
  );
  assert.equal(
    canManageFlightConnections({
      memberRole: 'OPERATOR',
      partnerId: 'flight-1',
      partnerType: 'FLIGHT',
    }),
    false,
  );
  assert.equal(
    canManageFlightConnections({ memberRole: 'ADMIN', partnerId: 'hotel-1', partnerType: 'HOTEL' }),
    false,
  );
});
