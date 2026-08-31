import assert from 'node:assert/strict';
import test from 'node:test';

import { isTrustedPortalMutation } from '../lib/api/portalOrigin.ts';
import { readFile } from 'node:fs/promises';

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

test('portal mutations without an origin require explicit same-site browser evidence', () => {
  const sameOrigin = new Request('https://www.mandyaltravels.com/api/v1/auth/logout', {
    method: 'POST',
    headers: { 'sec-fetch-site': 'same-origin' },
  });
  const sameSite = new Request('https://www.mandyaltravels.com/api/v1/auth/logout', {
    method: 'POST',
    headers: { 'sec-fetch-site': 'same-site' },
  });
  const ambiguous = new Request('https://www.mandyaltravels.com/api/v1/auth/logout', {
    method: 'POST',
  });

  assert.equal(isTrustedPortalMutation(sameOrigin, 'https://www.mandyaltravels.com'), true);
  assert.equal(isTrustedPortalMutation(sameSite, 'https://www.mandyaltravels.com'), true);
  assert.equal(isTrustedPortalMutation(ambiguous, 'https://www.mandyaltravels.com'), false);
});

test('production pins portal mutations and logout redirects to the public custom domain', async () => {
  const [render, logout] = await Promise.all([
    readFile(new URL('../render.yaml', import.meta.url), 'utf8'),
    readFile(new URL('../app/api/v1/auth/logout/route.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(render, /key: PUBLIC_APP_ORIGIN\s+value: https:\/\/www\.mandyaltravels\.com/);
  assert.match(logout, /resolvePublicPortalOrigin\(\)/);
  assert.doesNotMatch(logout, /new URL\('\/', request\.url\)/);
});
