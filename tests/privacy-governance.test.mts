import assert from 'node:assert/strict';
import test from 'node:test';
import { isPrivacyRequestType, privacyRequestDueAt } from '../lib/privacy/governance.ts';

test('privacy request types are explicit and closed', () => {
  assert.equal(isPrivacyRequestType('DELETION'), true);
  assert.equal(isPrivacyRequestType('ERASE_EVERYTHING'), false);
});

test('privacy reviews receive a deterministic 30-day due date', () => {
  assert.equal(
    privacyRequestDueAt(new Date('2026-01-01T00:00:00Z')).toISOString(),
    '2026-01-31T00:00:00.000Z',
  );
});
