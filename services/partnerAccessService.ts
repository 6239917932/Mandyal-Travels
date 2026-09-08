import { createHash, randomBytes } from 'node:crypto';

import type { PartnerAccess } from '@/lib/partnerAuth';

export const PARTNER_INVITATION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

export const PARTNER_ACCESS_ACTIONS = {
  INVITATION_ACCEPTED: 'PARTNER_INVITATION_ACCEPTED',
  INVITATION_CREATED: 'PARTNER_INVITATION_CREATED',
  INVITATION_REVOKED: 'PARTNER_INVITATION_REVOKED',
  MEMBER_REMOVED: 'PARTNER_MEMBER_REMOVED',
  MEMBER_ROLE_UPDATED: 'PARTNER_MEMBER_ROLE_UPDATED',
} as const;

export function createPartnerInvitationToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashPartnerInvitationToken(token) };
}

export function hashPartnerInvitationToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function getPartnerInvitationExpiry() {
  return new Date(Date.now() + PARTNER_INVITATION_DURATION_MS);
}

export function isPartnerInvitationActive(status: string, expiresAt: Date) {
  return status === 'PENDING' && expiresAt.getTime() > Date.now();
}

export function isPartnerAdministrator(
  access: PartnerAccess | null,
): access is PartnerAccess & { partnerId: string; userId: string } {
  return Boolean(
    access?.mode === 'user-session' &&
    access.partnerId &&
    access.userId &&
    access.memberRole === 'ADMIN',
  );
}
