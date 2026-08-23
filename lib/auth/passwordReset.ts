import { createHash, randomBytes } from 'node:crypto';

export const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export function hashPasswordResetToken(token: string): string | null {
  const normalized = token.trim().toLowerCase();
  if (!TOKEN_PATTERN.test(normalized)) return null;
  return createHash('sha256').update(normalized).digest('hex');
}

export function createPasswordResetToken(now = new Date()) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashPasswordResetToken(token);
  if (!tokenHash) throw new Error('PASSWORD_RESET_TOKEN_GENERATION_FAILED');

  return {
    expiresAt: new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS),
    token,
    tokenHash,
  };
}
