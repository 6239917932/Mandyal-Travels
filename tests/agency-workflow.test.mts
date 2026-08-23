import assert from 'node:assert/strict';
import test from 'node:test';

import { parseAgencyCustomerInput } from '../services/agencyCustomerService.ts';
import {
  matchesAgencyTravelRequest,
  parseAgencyTravelRequestInput,
} from '../services/agencyTravelRequestService.ts';

test('agency customer input normalizes contact details and preserves an allowed status', () => {
  assert.deepEqual(
    parseAgencyCustomerInput({
      displayName: '  Priya Sharma  ',
      email: ' PRIYA@EXAMPLE.COM ',
      notes: ' Window seat ',
      phone: ' +91 98765 43210 ',
      status: 'inactive',
    }),
    {
      ok: true,
      value: {
        displayName: 'Priya Sharma',
        email: 'priya@example.com',
        notes: 'Window seat',
        phone: '+91 98765 43210',
        status: 'INACTIVE',
      },
    },
  );
});

test('agency customer input rejects invalid identity and status values', () => {
  assert.equal(parseAgencyCustomerInput({ displayName: 'P', email: 'bad' }).ok, false);
  assert.equal(
    parseAgencyCustomerInput({
      displayName: 'Priya',
      email: 'priya@example.com',
      status: 'DELETED',
    }).ok,
    false,
  );
});

test('agency travel requests enforce product-specific dates and integer money', () => {
  const valid = parseAgencyTravelRequestInput(
    {
      agencyCustomerId: 'customer-1',
      endDate: '2026-09-12',
      estimatedAmount: 25_000,
      productType: 'hotel',
      startDate: '2026-09-10',
      title: 'Delhi client visit',
    },
    '2026-08-23',
  );
  assert.equal(valid.ok, true);
  assert.equal(
    parseAgencyTravelRequestInput(
      {
        agencyCustomerId: 'customer-1',
        estimatedAmount: 25_000,
        productType: 'HOTEL',
        startDate: '2026-09-10',
        title: 'Delhi client visit',
      },
      '2026-08-23',
    ).ok,
    false,
  );
  assert.equal(
    parseAgencyTravelRequestInput(
      {
        agencyCustomerId: 'customer-1',
        estimatedAmount: 25_000.5,
        productType: 'BUS',
        startDate: '2026-09-10',
        title: 'Delhi client visit',
      },
      '2026-08-23',
    ).ok,
    false,
  );
});

test('agency idempotency requires the same customer, organization, actor, and request details', () => {
  const requested = {
    agencyCustomerId: 'customer-1',
    endDate: null,
    estimatedAmount: 8_000,
    productType: 'FLIGHT',
    startDate: '2026-09-10',
    title: 'Delhi client visit',
  };
  const existing = {
    ...requested,
    organizationId: 'agency-1',
    requesterId: 'agent-1',
  };
  assert.equal(
    matchesAgencyTravelRequest(existing, requested, {
      organizationId: 'agency-1',
      requesterId: 'agent-1',
    }),
    true,
  );
  assert.equal(
    matchesAgencyTravelRequest(
      existing,
      { ...requested, agencyCustomerId: 'customer-2' },
      {
        organizationId: 'agency-1',
        requesterId: 'agent-1',
      },
    ),
    false,
  );
  assert.equal(
    matchesAgencyTravelRequest(existing, requested, {
      organizationId: 'agency-2',
      requesterId: 'agent-1',
    }),
    false,
  );
});
