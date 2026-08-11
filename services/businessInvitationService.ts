import { createHash, randomBytes } from 'node:crypto';

export const BUSINESS_INVITATION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

export function createBusinessInvitationToken() {
  const token = randomBytes(32).toString('base64url');

  return {
    token,
    tokenHash: hashBusinessInvitationToken(token),
  };
}

export function hashBusinessInvitationToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function getBusinessInvitationExpiry() {
  return new Date(Date.now() + BUSINESS_INVITATION_DURATION_MS);
}

export function isBusinessInvitationActive(status: string, expiresAt: Date) {
  return status === 'PENDING' && expiresAt.getTime() > Date.now();
}
