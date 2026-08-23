import assert from 'node:assert/strict';
import test from 'node:test';

import {
  agencyReportSearchParams,
  buildAgencyReportWhere,
  parseAgencyReportFilters,
} from '../services/agencyReportService.ts';

test('agency report filters normalize supported values and reject malformed inputs', () => {
  assert.deepEqual(
    parseAgencyReportFilters({
      customer: [' customer-1 ', 'ignored'],
      from: '2026-09-01',
      product: 'hotel',
      search: '  Priya  ',
      status: 'booked',
      to: 'not-a-date',
    }),
    {
      customer: 'customer-1',
      from: '2026-09-01',
      product: 'HOTEL',
      search: 'Priya',
      status: 'BOOKED',
      to: '',
    },
  );
});

test('agency report query always applies organization scope to requests and customers', () => {
  const where = buildAgencyReportWhere('agency-1', {
    customer: 'customer-1',
    from: '',
    product: '',
    search: '',
    status: '',
    to: '',
  });

  assert.deepEqual(where, {
    agencyCustomerLink: {
      is: { agencyCustomer: { is: { id: 'customer-1', organizationId: 'agency-1' } } },
    },
    organizationId: 'agency-1',
  });
});

test('agency report URL preserves only active normalized filters', () => {
  assert.equal(
    agencyReportSearchParams({
      customer: '',
      from: '2026-09-01',
      product: 'FLIGHT',
      search: '',
      status: 'PENDING',
      to: '',
    }).toString(),
    'from=2026-09-01&product=FLIGHT&status=PENDING',
  );
});
