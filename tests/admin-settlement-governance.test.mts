import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  adminSettlementPath,
  hasUnresolvedRefund,
  normalizeAdminSettlementFilters,
  normalizeSettlementTransition,
  privateSettlementReference,
} from '../services/adminSettlementWorkbenchService.ts';

test('settlement filters are closed, bounded, and preserve pagination state', () => {
  const filters = normalizeAdminSettlementFilters({
    page: '3',
    q: '  mountain   stays ',
    status: 'approved',
  });
  assert.deepEqual(filters, { page: 3, query: 'mountain stays', status: 'APPROVED' });
  assert.equal(
    adminSettlementPath(filters, 4),
    '/admin/settlements?page=4&q=mountain+stays&status=APPROVED',
  );
  assert.deepEqual(normalizeAdminSettlementFilters({ page: '-1', status: 'DELETED' }), {
    page: 1,
    query: '',
    status: 'ALL',
  });
});

test('unresolved refund states hold bookings out of settlement', () => {
  assert.equal(hasUnresolvedRefund(['APPROVED']), false);
  assert.equal(hasUnresolvedRefund(['REJECTED', 'APPROVED']), false);
  assert.equal(hasUnresolvedRefund(['PENDING']), true);
  assert.equal(hasUnresolvedRefund(['processing']), true);
  assert.equal(hasUnresolvedRefund(['PROVIDER_FAILED']), true);
});

test('settlement transitions require a reviewed version and meaningful audit note', () => {
  assert.deepEqual(
    normalizeSettlementTransition({
      action: 'APPROVE',
      expectedVersion: '2',
      note: '  Reconciled   capture evidence reviewed. ',
    }),
    {
      action: 'APPROVE',
      expectedVersion: 2,
      note: 'Reconciled capture evidence reviewed.',
    },
  );
  assert.equal(
    normalizeSettlementTransition({
      action: 'APPROVE',
      expectedVersion: 0,
      note: 'Valid note text',
    }),
    null,
  );
  assert.equal(
    normalizeSettlementTransition({ action: 'APPROVE', expectedVersion: 1, note: 'short' }),
    null,
  );
});

test('mark-paid transitions require a bounded safe payment reference', () => {
  assert.deepEqual(
    normalizeSettlementTransition({
      action: 'MARK_PAID',
      expectedVersion: 3,
      note: 'Bank confirmation was independently reviewed.',
      paymentReference: 'BANK/2026-08:123',
    }),
    {
      action: 'MARK_PAID',
      expectedVersion: 3,
      note: 'Bank confirmation was independently reviewed.',
      paymentReference: 'BANK/2026-08:123',
    },
  );
  assert.equal(
    normalizeSettlementTransition({
      action: 'MARK_PAID',
      expectedVersion: 3,
      note: 'Bank confirmation was independently reviewed.',
      paymentReference: 'unsafe reference!',
    }),
    null,
  );
});

test('settlement references are masked and transition history is append-only', () => {
  assert.match(privateSettlementReference('BANK/2026-08:123'), /^PAY-[A-F0-9]{10}$/);
  assert.equal(privateSettlementReference(''), '');
  const schema = readFileSync('prisma/schema.prisma', 'utf8');
  const service = readFileSync('services/partnerSettlementService.ts', 'utf8');
  assert.match(schema, /model PartnerSettlementEvent/);
  assert.match(schema, /version\s+Int\s+@default\(1\)/);
  assert.match(service, /partnerSettlementEvent\.create/);
  assert.match(service, /where: \{ id, status: settlement\.status, version: expectedVersion \}/);
});
