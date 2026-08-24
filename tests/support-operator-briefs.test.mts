import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSupportOperatorBrief } from '../services/supportOperatorBriefService.ts';

const now = new Date('2026-08-24T12:00:00.000Z');

test('customer brief is deterministic and contains only bounded record-derived context', () => {
  const input = {
    bookingReferencePresent: true,
    category: 'PAYMENT',
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    kind: 'CUSTOMER' as const,
    status: 'OPEN',
  };

  const first = buildSupportOperatorBrief(input, now);
  const second = buildSupportOperatorBrief(input, now);

  assert.deepEqual(first, second);
  assert.equal(
    first.summary,
    'Awaiting human review · Payment · Booking reference attached · Opened 3–6 days ago',
  );
  assert.equal(first.checklist.length, 4);
  assert.match(first.checklist[0], /signed-in customer owns/);
  assert.match(first.checklist[2], /do not infer settlement/);
});

test('business brief requires organization authority and does not invent a booking link', () => {
  const brief = buildSupportOperatorBrief(
    {
      bookingReferencePresent: false,
      category: 'BILLING',
      createdAt: new Date('2026-08-24T11:00:00.000Z'),
      kind: 'BUSINESS',
      status: 'CLOSED',
    },
    now,
  );

  assert.match(brief.checklist[0], /active organization membership/);
  assert.match(brief.checklist[1], /minimum booking context/);
  assert.match(brief.checklist[3], /recorded resolution/);
  assert.ok(brief.context.includes('No booking reference attached'));
});

test('unknown categories and statuses fall back without echoing untrusted values', () => {
  const category = 'SECRET-account-number-123';
  const status = 'INTERNAL_ESCALATION_TOKEN';
  const brief = buildSupportOperatorBrief(
    {
      bookingReferencePresent: false,
      category,
      createdAt: new Date('2026-08-30T00:00:00.000Z'),
      kind: 'CUSTOMER',
      status,
    },
    now,
  );

  assert.ok(brief.context.includes('General support'));
  assert.ok(brief.context.includes('Status requires manual verification'));
  assert.ok(brief.context.includes('Opened today'));
  assert.doesNotMatch(JSON.stringify(brief), new RegExp(`${category}|${status}`));
});

test('prototype names and invalid dates fail closed', () => {
  const brief = buildSupportOperatorBrief(
    {
      bookingReferencePresent: false,
      category: 'toString',
      createdAt: new Date('invalid'),
      kind: 'CUSTOMER',
      status: 'OPEN',
    },
    now,
  );

  assert.ok(brief.context.includes('General support'));
  assert.ok(brief.context.includes('Opened date unavailable'));
});

test('brief API cannot receive or reproduce free-text case content or personal data', () => {
  const source = buildSupportOperatorBrief.toString();
  assert.doesNotMatch(source, /message|subject|email|firstName|lastName|organizationName/);
});
