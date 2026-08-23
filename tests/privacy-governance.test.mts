import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isPrivacyRequestType,
  normalizePrivacyResolutionNote,
  privacyRequestDueAt,
  privacyRequestTransition,
} from '../lib/privacy/governance.ts';

test('privacy request types are explicit and closed', () => {
  assert.equal(isPrivacyRequestType('DELETION'), true);
  assert.equal(isPrivacyRequestType('ERASE_EVERYTHING'), false);
});

test('privacy review lifecycle allows only explicit human-controlled transitions', () => {
  assert.equal(privacyRequestTransition('OPEN', 'START_REVIEW'), 'IN_REVIEW');
  assert.equal(privacyRequestTransition('IN_REVIEW', 'COMPLETE'), 'COMPLETED');
  assert.equal(privacyRequestTransition('IN_REVIEW', 'REJECT'), 'REJECTED');
  assert.equal(privacyRequestTransition('COMPLETED', 'REOPEN'), 'IN_REVIEW');
  assert.equal(privacyRequestTransition('OPEN', 'COMPLETE'), null);
  assert.equal(privacyRequestTransition('COMPLETED', 'DELETE_DATA'), null);
});

test('privacy review notes are trimmed and strictly bounded', () => {
  assert.equal(
    normalizePrivacyResolutionNote('  Identity verified and archive delivered.  '),
    'Identity verified and archive delivered.',
  );
  assert.equal(normalizePrivacyResolutionNote('too short'), null);
  assert.equal(normalizePrivacyResolutionNote('x'.repeat(501)), null);
});

test('privacy reviews receive a deterministic 30-day due date', () => {
  assert.equal(
    privacyRequestDueAt(new Date('2026-01-01T00:00:00Z')).toISOString(),
    '2026-01-31T00:00:00.000Z',
  );
});
