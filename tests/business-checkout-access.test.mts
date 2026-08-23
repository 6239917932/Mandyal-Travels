import assert from 'node:assert/strict';
import test from 'node:test';

import { buildBusinessCheckoutAccessWhere } from '../services/businessCheckoutAccess.ts';

test('business checkout permits the requester or a scoped travel-agency administrator', () => {
  assert.deepEqual(buildBusinessCheckoutAccessWhere('request-1', 'user-1'), {
    id: 'request-1',
    OR: [
      { requesterId: 'user-1' },
      {
        agencyCustomerLink: { isNot: null },
        organization: {
          is: {
            members: { some: { role: 'ADMIN', userId: 'user-1' } },
            type: 'TRAVEL_AGENCY',
          },
        },
      },
    ],
  });
});
