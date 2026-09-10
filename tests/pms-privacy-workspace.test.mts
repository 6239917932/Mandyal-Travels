import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('partner privacy workspace reuses existing governed account controls', async () => {
  const page = await readFile(
    new URL('../app/partner/pms/privacy/page.tsx', import.meta.url),
    'utf8',
  );
  assert.match(page, /PrivacyRequestManager/);
  assert.match(page, /href="\/api\/v1\/account\/export"/);
  assert.match(page, /href="\/account\/consents"/);
  assert.match(page, /href="\/legal\/privacy"/);
  assert.match(page, /Deletion is a governed request, not an immediate destructive action/);
  assert.match(page, /does not bulk-delete guest, employee, finance, or compliance records/);
});

test('privacy workspace data is bounded and scoped to the signed-in partner member', async () => {
  const service = await readFile(
    new URL('../services/partnerPrivacyWorkspaceService.ts', import.meta.url),
    'utf8',
  );
  assert.match(service, /partnerId: input\.partnerId/);
  assert.match(service, /userId: input\.userId/);
  assert.match(service, /take: MAX_PROPERTIES \+ 1/);
  assert.match(service, /take: MAX_RECENT_RECORDS/);
  assert.doesNotMatch(
    service,
    /prisma\.[A-Za-z]+\.(?:create|update|delete)\(|transaction\.[A-Za-z]+\.(?:create|update|delete)\(/,
  );
});

test('privacy page does not claim a complete partner export or automatic erasure', async () => {
  const page = await readFile(
    new URL('../app/partner/pms/privacy/page.tsx', import.meta.url),
    'utf8',
  );
  assert.match(page, /not a\s+bulk export of every guest or employee record/);
  assert.match(page, /does not claim a universal fixed retention period/);
  assert.doesNotMatch(page, /Delete all data|automatic deletion|instant deletion/i);
});
