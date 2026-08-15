import assert from 'node:assert/strict';
import test from 'node:test';

import { resolvePublicPortalOrigin } from '../lib/url/publicOrigin.ts';

test('public portal origins require a canonical HTTPS origin in production', () => {
  assert.equal(
    resolvePublicPortalOrigin('https://www.mandyaltravels.com', 'production'),
    'https://www.mandyaltravels.com',
  );
  assert.throws(
    () => resolvePublicPortalOrigin('http://www.mandyaltravels.com', 'production'),
    /PUBLIC_APP_ORIGIN_INVALID/,
  );
  assert.throws(
    () => resolvePublicPortalOrigin('https://www.mandyaltravels.com/path', 'production'),
    /PUBLIC_APP_ORIGIN_INVALID/,
  );
  assert.throws(
    () => resolvePublicPortalOrigin(undefined, 'production'),
    /PUBLIC_APP_ORIGIN_NOT_CONFIGURED/,
  );
});

test('local development has a safe localhost default', () => {
  assert.equal(resolvePublicPortalOrigin(undefined, 'development'), 'http://localhost:3000');
  assert.equal(
    resolvePublicPortalOrigin('http://127.0.0.1:3000', 'development'),
    'http://127.0.0.1:3000',
  );
});
