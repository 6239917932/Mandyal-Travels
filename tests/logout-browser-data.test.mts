import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const logoutRoute = await readFile('app/api/v1/auth/logout/route.ts', 'utf8');

test('logout clears browser-held Mandyal session data before returning home', () => {
  assert.match(logoutRoute, /deleteCurrentSession\(\)/);
  assert.match(logoutRoute, /Clear-Site-Data/);
  assert.ok(logoutRoute.includes('\'"cache", "cookies", "storage"\''));
  assert.match(logoutRoute, /resolvePublicPortalOrigin\(\)/);
  assert.match(logoutRoute, /303/);
});
