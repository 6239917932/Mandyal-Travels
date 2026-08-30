import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('launch posture blocks every partner mutation before route authorization', async () => {
  const source = await readFile(new URL('../proxy.ts', import.meta.url), 'utf8');

  assert.match(source, /PARTNER_MUTATIONS_ENABLED.*=== 'true'/);
  assert.match(source, /!SAFE_METHODS\.has\(request\.method\)/);
  assert.match(source, /startsWith\('\/api\/v1\/partner\/'\)/);
  assert.match(source, /'\/api\/v1\/partners\/applications'/);
  assert.match(source, /PARTNER_OPERATIONS_PAUSED/);
});

test('Render keeps supplier writes disabled for the Cashfree review launch', async () => {
  const source = await readFile(new URL('../render.yaml', import.meta.url), 'utf8');

  assert.match(source, /key: PARTNER_MUTATIONS_ENABLED\s+value: 'false'/);
});
