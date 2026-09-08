import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  createPartnerInvitationToken,
  hashPartnerInvitationToken,
  isPartnerInvitationActive,
  PARTNER_INVITATION_DURATION_MS,
} from '../services/partnerAccessService.ts';

test('partner invitations store a non-reversible hash and use a seven-day lifetime', () => {
  const first = createPartnerInvitationToken();
  const second = createPartnerInvitationToken();
  assert.notEqual(first.token, second.token);
  assert.notEqual(first.token, first.tokenHash);
  assert.equal(hashPartnerInvitationToken(first.token), first.tokenHash);
  assert.equal(PARTNER_INVITATION_DURATION_MS, 7 * 24 * 60 * 60 * 1000);
});

test('partner invitation activity requires pending status and a future expiry', () => {
  assert.equal(isPartnerInvitationActive('PENDING', new Date(Date.now() + 60_000)), true);
  assert.equal(isPartnerInvitationActive('REVOKED', new Date(Date.now() + 60_000)), false);
  assert.equal(isPartnerInvitationActive('PENDING', new Date(Date.now() - 1)), false);
});

test('access routes enforce admin boundaries and protect the final administrator', () => {
  const createRoute = fs.readFileSync('app/api/v1/partner/invitations/route.ts', 'utf8');
  const memberRoute = fs.readFileSync('app/api/v1/partner/members/[membershipId]/route.ts', 'utf8');
  const acceptRoute = fs.readFileSync(
    'app/api/v1/partner/invitations/accept/[token]/route.ts',
    'utf8',
  );
  assert.match(createRoute, /isPartnerAdministrator/);
  assert.match(createRoute, /isSameOriginMutation/);
  assert.match(memberRoute, /LAST_ADMINISTRATOR/);
  assert.match(memberRoute, /isSameOriginMutation/);
  assert.match(memberRoute, /userSession\.deleteMany/);
  assert.match(acceptRoute, /hashPartnerInvitationToken/);
  assert.match(acceptRoute, /organizationMember\.findFirst/);
});

test('access control has a dedicated live page instead of duplicating the activity log', () => {
  const registry = fs.readFileSync('lib/pms/moduleRegistry.ts', 'utf8');
  const layout = fs.readFileSync('app/partner/layout.tsx', 'utf8');
  assert.match(
    registry,
    /href: '\/partner\/access'[\s\S]*name: 'Access control'[\s\S]*status: 'LIVE'/,
  );
  assert.match(layout, /label: 'Activity log'/);
  assert.doesNotMatch(layout, /label: 'Activity and access'/);
});
