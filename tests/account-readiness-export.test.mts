import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('account readiness navigation exposes notifications and governed benefits', async () => {
  const page = await readFile(new URL('../app/account/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /href: '\/account\/notifications'/);
  assert.match(page, /href: '\/account\/benefits'/);
});

test('account export scopes readiness records to the authenticated user', async () => {
  const route = await readFile(
    new URL('../app/api/v1/account/export/route.ts', import.meta.url),
    'utf8',
  );

  assert.match(route, /notificationDelivery\.findMany/);
  assert.match(route, /loyaltyAccount\.findUnique/);
  assert.match(route, /referralCode\.findMany/);
  assert.match(route, /where: \{ userId: user\.id \}/);
  assert.match(route, /where: \{ ownerUserId: user\.id \}/);
  assert.match(route, /account: \{ is: \{ userId: user\.id \} \}/);
  assert.match(route, /benefitsReadiness: \{ loyaltyAccount, referralCodes \}/);
  assert.match(route, /notificationHistory: safeNotificationHistory/);
});

test('account readiness export omits notification and ledger operational identifiers', async () => {
  const route = await readFile(
    new URL('../app/api/v1/account/export/route.ts', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(route, /providerRef|lastError|variablesJson|dedupeKey|nextAttemptAt/);
  assert.doesNotMatch(route, /referenceId|accountId|ownerUserId: true|userId: true/);
  assert.doesNotMatch(route, /code: true/);
  assert.match(route, /customerNotificationTitle\(_\.templateKey\)/);
  assert.match(route, /'Cache-Control': 'no-store'/);
});

test('account export has a snapshot-consistent absolute record cap', async () => {
  const route = await readFile(
    new URL('../app/api/v1/account/export/route.ts', import.meta.url),
    'utf8',
  );

  assert.match(route, /prisma\.\$transaction\(async \(tx\)/);
  assert.match(route, /tx\.customerSupportCaseEvent\.count/);
  assert.match(route, /supportCase: \{ is: \{ userId: user\.id \} \}/);
  assert.match(route, /recordCounts\.reduce/);
  assert.match(route, /take: MAX_EXPORT_RECORDS \+ 1/);
});

test('account export description discloses all customer archive categories', async () => {
  const page = await readFile(new URL('../app/account/page.tsx', import.meta.url), 'utf8');

  assert.match(page, /security activity/);
  assert.match(page, /customer-friendly notification history/);
  assert.match(page, /benefits-readiness records/);
});
