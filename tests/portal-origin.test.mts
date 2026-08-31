import assert from 'node:assert/strict';
import test from 'node:test';

import { isTrustedPortalMutation } from '../lib/api/portalOrigin.ts';

test('portal mutations accept the public host when a reverse proxy uses an internal request URL', () => {
  const request = new Request('https://mandyal-travels.onrender.com/api/v1/auth/logout', {
    method: 'POST',
    headers: {
      host: 'mandyaltravels.com',
      origin: 'https://mandyaltravels.com',
      'sec-fetch-site': 'same-origin',
      'x-forwarded-proto': 'https',
    },
  });

  assert.equal(isTrustedPortalMutation(request, 'https://www.mandyaltravels.com'), true);
});

test('portal mutations accept canonical www and apex aliases', () => {
  for (const origin of ['https://www.mandyaltravels.com', 'https://mandyaltravels.com']) {
    const request = new Request('https://mandyal-travels.onrender.com/api/v1/auth/logout', {
      method: 'POST',
      headers: { origin, 'sec-fetch-site': 'same-site' },
    });
    assert.equal(isTrustedPortalMutation(request, 'https://www.mandyaltravels.com'), true);
  }
});

test('portal mutations continue to reject cross-site and unrelated origins', () => {
  const crossSite = new Request('https://mandyal-travels.onrender.com/api/v1/auth/logout', {
    method: 'POST',
    headers: {
      origin: 'https://evil.example',
      'sec-fetch-site': 'cross-site',
    },
  });
  const mismatched = new Request('https://mandyal-travels.onrender.com/api/v1/auth/logout', {
    method: 'POST',
    headers: { origin: 'https://evil.example', 'sec-fetch-site': 'same-site' },
  });

  assert.equal(isTrustedPortalMutation(crossSite, 'https://www.mandyaltravels.com'), false);
  assert.equal(isTrustedPortalMutation(mismatched, 'https://www.mandyaltravels.com'), false);
});
