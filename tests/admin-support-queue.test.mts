import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adminSupportQueuePath,
  normalizeAdminSupportQueueFilters,
} from '../services/adminSupportQueueService.ts';

test('admin support filters default to the open customer queue', () => {
  assert.deepEqual(normalizeAdminSupportQueueFilters({}), {
    page: 1,
    query: '',
    status: 'OPEN',
    type: 'CUSTOMER',
  });
});

test('admin support filters normalize bounded supported values', () => {
  assert.deepEqual(
    normalizeAdminSupportQueueFilters({
      page: '3',
      q: `  ${'payment '.repeat(20)}  `,
      status: 'closed',
      type: 'business',
    }),
    {
      page: 3,
      query: 'payment '.repeat(20).trim().slice(0, 100),
      status: 'CLOSED',
      type: 'BUSINESS',
    },
  );
});

test('admin support paths preserve active filters and clamp invalid pages', () => {
  const filters = normalizeAdminSupportQueueFilters({
    page: '2',
    q: 'MT-1001',
    status: 'all',
    type: 'customer',
  });
  assert.equal(
    adminSupportQueuePath(filters, 0),
    '/admin/support?page=1&status=ALL&type=CUSTOMER&q=MT-1001',
  );
});
