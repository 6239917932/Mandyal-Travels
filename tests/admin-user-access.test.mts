import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  normalizeUserAccessChange,
  userAccessConfirmation,
  userAccessTargetStatus,
} from '../services/adminUserAccessRules.ts';

test('user-access requests use a closed action catalogue, bounded reason, and current version', () => {
  assert.deepEqual(
    normalizeUserAccessChange({
      action: 'suspend',
      confirmation: 'SUSPEND customer@example.com',
      expectedVersion: 3,
      reason: 'Repeated verified account-security incidents require review.',
    }),
    {
      action: 'SUSPEND',
      confirmation: 'SUSPEND customer@example.com',
      expectedVersion: 3,
      reason: 'Repeated verified account-security incidents require review.',
    },
  );
  assert.equal(
    normalizeUserAccessChange({
      action: 'DELETE',
      confirmation: 'DELETE customer@example.com',
      expectedVersion: 3,
      reason: 'This action is deliberately outside the closed lifecycle.',
    }),
    null,
  );
  assert.equal(
    normalizeUserAccessChange({
      action: 'SUSPEND',
      confirmation: 'SUSPEND customer@example.com',
      expectedVersion: -1,
      reason: 'too short',
    }),
    null,
  );
  assert.equal(
    normalizeUserAccessChange({
      action: 'SUSPEND',
      confirmation: 'SUSPEND customer@example.com',
      expectedVersion: null,
      reason: 'A null version must never be treated as the initial version.',
    }),
    null,
  );
});

test('user access only transitions between active and suspended states', () => {
  assert.equal(userAccessTargetStatus('ACTIVE', 'SUSPEND'), 'SUSPENDED');
  assert.equal(userAccessTargetStatus('SUSPENDED', 'RESTORE'), 'ACTIVE');
  assert.equal(userAccessTargetStatus('ACTIVE', 'RESTORE'), null);
  assert.equal(userAccessTargetStatus('SUSPENDED', 'SUSPEND'), null);
  assert.equal(
    userAccessConfirmation('SUSPEND', 'customer@example.com'),
    'SUSPEND customer@example.com',
  );
});

test('access mutation preserves atomic governance and last-admin protections', () => {
  const source = fs.readFileSync('services/adminUserAccessService.ts', 'utf8');
  assert.match(source, /isolationLevel: 'Serializable'/);
  assert.match(source, /actor\?\.accessStatus !== 'ACTIVE'/);
  assert.match(source, /actor\.role !== 'PLATFORM_ADMIN'/);
  assert.match(source, /target\.id === input\.actorUserId/);
  assert.match(source, /accessStatus: 'ACTIVE', role: 'PLATFORM_ADMIN'/);
  assert.match(source, /activeAdministratorCount <= 1/);
  assert.match(source, /accessStatus: target\.accessStatus/);
  assert.match(source, /accessVersion: target\.accessVersion/);
  assert.match(source, /userSession\.deleteMany\(\{ where: \{ userId: target\.id \} \}\)/);
  assert.match(source, /userAccessEvent\.create/);
  assert.match(source, /version: nextVersion/);
  assert.match(source, /userAccessConfirmation\(input\.request\.action, target\.email\)/);
});

test('authentication fails closed for suspended or unknown account access', () => {
  const login = fs.readFileSync('app/api/v1/auth/login/route.ts', 'utf8');
  const session = fs.readFileSync('lib/auth/session.ts', 'utf8');
  const admin = fs.readFileSync('lib/adminAuth.ts', 'utf8');
  const registration = fs.readFileSync('app/api/v1/auth/register/route.ts', 'utf8');

  assert.match(login, /user\.accessStatus !== 'ACTIVE'/);
  assert.match(login, /The email or password is incorrect/);
  assert.match(session, /user\.accessStatus !== 'ACTIVE'/);
  assert.match(session, /session\.user\.accessStatus !== 'ACTIVE'/);
  assert.match(session, /userSession\.deleteMany\(\{ where: \{ id: session\.id \} \}\)/);
  assert.match(admin, /user\.accessStatus === 'ACTIVE'/);
  assert.doesNotMatch(registration, /role:\s*'PLATFORM_ADMIN'/);
});

test('administrator UI and audit require version, reason, and exact confirmation without role controls', () => {
  const component = fs.readFileSync('components/admin/AdminUserAccessManager.tsx', 'utf8');
  const audit = fs.readFileSync('app/admin/audit/page.tsx', 'utf8');
  const route = fs.readFileSync('app/api/v1/admin/users/[userId]/access/route.ts', 'utf8');

  assert.match(component, /expectedVersion: accessVersion/);
  assert.match(component, /reason: formData\.get\('reason'\)/);
  assert.match(component, /confirmation: formData\.get\('confirmation'\)/);
  assert.doesNotMatch(component, /PLATFORM_ADMIN/);
  assert.match(route, /getPlatformAdmin\(\)/);
  assert.match(audit, /prisma\.userAccessEvent\.findMany/);
  assert.match(audit, /domain: 'SECURITY'/);
});

test('offline platform-admin provisioning only accepts an active customer and revokes sessions', () => {
  const source = fs.readFileSync('scripts/grant-platform-admin.mjs', 'utf8');
  const businessMemberRoute = fs.readFileSync(
    'app/api/v1/business/members/[membershipId]/route.ts',
    'utf8',
  );
  assert.match(source, /GRANT_PLATFORM_ADMIN:/);
  assert.match(source, /user\.accessStatus !== 'ACTIVE'/);
  assert.match(source, /role = 'CUSTOMER'[\s\S]+accessStatus = 'ACTIVE'/);
  assert.match(source, /DELETE FROM UserSession WHERE userId = \?/);
  assert.match(source, /PLATFORM_ADMIN_GRANTED/);
  assert.match(source, /NOT EXISTS \(SELECT 1 FROM OrganizationMember/);
  assert.match(source, /NOT EXISTS \(SELECT 1 FROM SupplyPartnerMember/);
  assert.match(businessMemberRoute, /targetUser\.role === 'PLATFORM_ADMIN'/);
  assert.match(businessMemberRoute, /PROTECTED_PLATFORM_ADMIN/);
});
