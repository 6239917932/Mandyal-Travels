import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('private PMS trial grant is administrator-only, same-origin and safety-gated', async () => {
  const [route, service, form, page] = await Promise.all([
    readFile(
      new URL('../app/api/v1/admin/partners/trial-workspaces/route.ts', import.meta.url),
      'utf8',
    ),
    readFile(new URL('../services/partnerTrialWorkspaceService.ts', import.meta.url), 'utf8'),
    readFile(
      new URL('../components/admin/AdminPrivateTrialWorkspaceForm.tsx', import.meta.url),
      'utf8',
    ),
    readFile(new URL('../app/admin/partners/page.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(route, /isSameOriginMutation/);
  assert.match(route, /getPlatformAdmin/);
  assert.match(service, /TRIAL_PARTNER_WORKSPACES/);
  assert.match(service, /PAID_PARTNER_ONBOARDING/);
  assert.match(service, /PARTNER_PAYOUT_ONBOARDING/);
  assert.match(service, /PUBLIC_PARTNER_LISTINGS/);
  assert.match(service, /LIVE_MARKETPLACE_PAYMENTS/);
  assert.match(service, /CAR_MARKETPLACE/);
  assert.match(service, /emailVerifiedAt/);
  assert.match(service, /role !== 'CUSTOMER'/);
  assert.match(service, /PRIVATE_TRIAL_WORKSPACE_GRANTED/);
  assert.match(service, /type: 'HOTEL'/);
  assert.match(service, /role: 'PARTNER_ADMIN'/);
  assert.match(form, /does not approve KYC/);
  assert.match(page, /privateTrial\.enabled/);
});

test('trial workspace grant refuses to consume or bypass a pending KYC application', async () => {
  const service = await readFile(
    new URL('../services/partnerTrialWorkspaceService.ts', import.meta.url),
    'utf8',
  );
  assert.match(service, /partnerApplication\.findFirst/);
  assert.match(service, /PENDING_APPLICATION_EXISTS/);
  assert.doesNotMatch(service, /partnerApplication\.(?:update|delete)/);
});
