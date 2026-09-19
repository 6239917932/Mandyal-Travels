import assert from 'node:assert/strict';
import test from 'node:test';

import { getSignedInReturnTo } from '../lib/auth/redirect.ts';

test('signed-in non-admin accounts leave the denied admin/login loop', () => {
  for (const destination of [
    '/admin',
    '/admin?q=1',
    '/admin/contact-inquiries/123',
    '/%61dmin/users',
    '/hotels/../admin',
  ]) {
    assert.equal(getSignedInReturnTo(destination, 'CUSTOMER'), '/account');
    assert.equal(getSignedInReturnTo(destination, 'PARTNER_ADMIN'), '/partner');
    assert.equal(getSignedInReturnTo(destination, 'BUSINESS_ADMIN'), '/business/dashboard');
  }
});

test('signed-in redirects preserve authorized admin and public destinations', () => {
  assert.equal(
    getSignedInReturnTo('/admin/contact-inquiries?q=PMS', 'PLATFORM_ADMIN'),
    '/admin/contact-inquiries?q=PMS',
  );
  assert.equal(
    getSignedInReturnTo('/hotels?destination=Mandi', 'CUSTOMER'),
    '/hotels?destination=Mandi',
  );
  assert.equal(getSignedInReturnTo('/partners/apply', 'CUSTOMER'), '/partners/apply');
});

test('invalid and recursive login destinations fall back to the account home', () => {
  for (const destination of [
    null,
    'https://example.invalid',
    '//example.invalid',
    '/login?returnTo=/login',
    '/login/',
    '/%zz',
  ]) {
    assert.equal(getSignedInReturnTo(destination, 'CUSTOMER'), '/account');
  }
});
