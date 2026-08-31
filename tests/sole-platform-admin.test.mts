import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('production startup enforces one separately configured platform administrator', () => {
  const script = readFileSync('scripts/enforce-sole-platform-admin.mjs', 'utf8');
  const start = readFileSync('scripts/start-render.mjs', 'utf8');
  const render = readFileSync('render.yaml', 'utf8');

  assert.match(render, /key: SOLE_PLATFORM_ADMIN_EMAIL\s+sync: false/);
  assert.match(start, /scripts\/enforce-sole-platform-admin\.mjs/);
  assert.match(script, /SOLE_PLATFORM_ADMIN_EMAIL/);
  assert.match(script, /FOR UPDATE/);
  assert.match(script, /SET role = 'PLATFORM_ADMIN'/);
  assert.match(script, /SET role = 'CUSTOMER'/);
  assert.match(script, /DELETE FROM "UserSession"/);
  assert.match(script, /SOLE_PLATFORM_ADMIN_INVARIANT_FAILED/);
  assert.doesNotMatch(script, /passwordHash|password|tokenHash/);
});
