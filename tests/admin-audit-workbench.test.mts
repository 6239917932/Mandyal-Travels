import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ADMIN_AUDIT_MAX_PAGE,
  adminAuditCreatedAtRange,
  adminAuditPath,
  auditSourceTake,
  normalizeAdminAuditFilters,
} from '../services/adminAuditWorkbenchService.ts';

test('administrator audit filters normalize supported bounded values', () => {
  assert.deepEqual(
    normalizeAdminAuditFilters({
      domain: 'partner',
      from: '2026-08-01',
      page: '2',
      q: `  ${'supplier '.repeat(20)}  `,
      to: '2026-08-31',
    }),
    {
      domain: 'PARTNER',
      from: '2026-08-01',
      page: 2,
      query: 'supplier '.repeat(20).trim().slice(0, 100),
      to: '2026-08-31',
    },
  );
});

test('administrator audit filters reject unsupported values and reversed dates', () => {
  assert.deepEqual(
    normalizeAdminAuditFilters({
      domain: 'payments-provider',
      from: '2026-09-01',
      page: '-4',
      to: '2026-08-01',
    }),
    { domain: 'ALL', from: '', page: 1, query: '', to: '' },
  );
});

test('administrator audit pagination and source reads remain hard bounded', () => {
  const filters = normalizeAdminAuditFilters({ domain: 'content', page: '500', q: 'shimla' });
  assert.equal(filters.page, ADMIN_AUDIT_MAX_PAGE);
  assert.equal(auditSourceTake(filters.page), 1000);
  assert.equal(adminAuditPath(filters, 0), '/admin/audit?page=1&domain=CONTENT&q=shimla');
});

test('administrator audit date ranges use an exclusive upper bound', () => {
  assert.deepEqual(adminAuditCreatedAtRange('2026-08-01', '2026-08-31'), {
    gte: new Date('2026-08-01T00:00:00.000Z'),
    lt: new Date('2026-09-01T00:00:00.000Z'),
  });
});
