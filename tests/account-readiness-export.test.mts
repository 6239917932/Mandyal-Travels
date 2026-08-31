import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('account navigation exposes customer-friendly preferences and benefits links', async () => {
  const page = await readFile(new URL('../app/account/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /href: '\/account\/notifications'/);
  assert.match(page, /href: '\/account\/consents'/);
  assert.match(page, /label: 'Privacy choices'/);
  assert.match(page, /href: '\/account\/benefits'/);
  assert.match(page, /label: 'Rewards status'/);
});

test('account export scopes readiness records to the authenticated user', async () => {
  const route = await readFile(
    new URL('../app/api/v1/account/export/route.ts', import.meta.url),
    'utf8',
  );

  assert.match(route, /notificationDelivery\.findMany/);
  assert.match(route, /userConsentRecord\.count/);
  assert.match(route, /userConsentRecord\.findMany/);
  assert.match(route, /loyaltyAccount\.findUnique/);
  assert.match(route, /referralCode\.findMany/);
  assert.match(route, /where: \{ userId: user\.id \}/);
  assert.match(route, /where: \{ ownerUserId: user\.id \}/);
  assert.match(route, /account: \{ is: \{ userId: user\.id \} \}/);
  assert.match(route, /benefitsReadiness: \{ loyaltyAccount, referralCodes \}/);
  assert.match(route, /notificationHistory: safeNotificationHistory/);
  assert.match(route, /consentHistory: safeConsentHistory/);
});

test('account readiness export omits notification and ledger operational identifiers', async () => {
  const route = await readFile(
    new URL('../app/api/v1/account/export/route.ts', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(route, /providerRef|lastError|variablesJson|dedupeKey|nextAttemptAt/);
  assert.doesNotMatch(route, /ipAddress|userAgent/);
  assert.doesNotMatch(route, /referenceId|accountId|ownerUserId: true|userId: true/);
  assert.doesNotMatch(route, /code: true/);
  assert.match(route, /customerNotificationTitle\(_\.templateKey\)/);
  assert.match(route, /customerConsentPurpose\(record\.purpose\)/);
  assert.match(route, /customerConsentPolicyEvidence\(record\.policyVersion\)/);
  assert.match(route, /customerConsentStatus\(record\.status\)\.label/);
  assert.match(route, /customerConsentSource\(record\.source\)/);
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

test('account export remains available from the protected settings page', async () => {
  const page = await readFile(new URL('../app/account/settings/page.tsx', import.meta.url), 'utf8');

  assert.match(page, /Download account data/);
  assert.match(page, /href="\/api\/v1\/account\/export"/);
  assert.match(page, /password, session tokens, and payment-card details are never included/i);
});
