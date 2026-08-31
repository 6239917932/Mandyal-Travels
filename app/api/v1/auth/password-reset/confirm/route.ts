import { Prisma } from '@/generated/prisma/client';
import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { hashPassword } from '@/lib/auth/password';
import { hashPasswordResetToken } from '@/lib/auth/passwordReset';
import {
  clearRateLimit,
  consumeRateLimit,
  getRequestRateLimitIdentifier,
} from '@/lib/auth/rateLimit';
import { isAcceptableNewPassword } from '@/lib/auth/validation';
import { prisma } from '@/lib/prisma';
import {
  ACCOUNT_SECURITY_ACTIONS,
  createAccountSecurityEventData,
} from '@/services/accountSecurityService';

const CONFIRM_LIMIT = 8;
const CONFIRM_WINDOW_MS = 30 * 60 * 1000;

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginMutation(request)) {
    return Response.json(
      { error: 'This request must originate from the Mandyal Travels portal.' },
      { status: 403 },
    );
  }

  const body = await readJsonObject(request);
  const token = typeof body?.token === 'string' ? body.token : '';
  const tokenHash = hashPasswordResetToken(token);
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';
  const confirmPassword = typeof body?.confirmPassword === 'string' ? body.confirmPassword : '';
  const rateLimitIdentifier = getRequestRateLimitIdentifier(
    request,
    tokenHash?.slice(0, 24) ?? 'invalid',
  );
  const rateLimit = await consumeRateLimit({
    action: 'PASSWORD_RESET_CONFIRM',
    identifier: rateLimitIdentifier,
    limit: CONFIRM_LIMIT,
    windowMs: CONFIRM_WINDOW_MS,
  });
  if (!rateLimit.allowed) {
    return Response.json(
      { error: 'Too many password reset attempts. Please wait before trying again.' },
      { headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) }, status: 429 },
    );
  }

  if (!tokenHash || !isAcceptableNewPassword(newPassword) || newPassword !== confirmPassword) {
    return Response.json(
      {
        error:
          'Enter a valid reset link and a matching, uncommon password between 10 and 128 characters.',
      },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(newPassword);
  const now = new Date();
  try {
    const changed = await prisma.$transaction(
      async (transaction) => {
        const resetToken = await transaction.passwordResetToken.findUnique({
          select: { id: true, userId: true },
          where: { tokenHash },
        });
        if (!resetToken) return false;

        const claim = await transaction.passwordResetToken.updateMany({
          data: { usedAt: now },
          where: {
            expiresAt: { gt: now },
            id: resetToken.id,
            usedAt: null,
          },
        });
        if (claim.count !== 1) return false;

        await transaction.user.update({
          data: { passwordHash },
          where: { id: resetToken.userId },
        });
        await transaction.userSession.deleteMany({ where: { userId: resetToken.userId } });
        await transaction.passwordResetToken.updateMany({
          data: { usedAt: now },
          where: { userId: resetToken.userId, usedAt: null },
        });
        await transaction.accountSecurityEvent.create({
          data: createAccountSecurityEventData({
            action: ACCOUNT_SECURITY_ACTIONS.PASSWORD_RESET_COMPLETED,
            summary: 'Your password was reset and all browser sessions were signed out.',
            userId: resetToken.userId,
          }),
        });
        return true;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (!changed) {
      return Response.json(
        { error: 'This password reset link is invalid or has expired.' },
        { status: 400 },
      );
    }
    await clearRateLimit('PASSWORD_RESET_CONFIRM', rateLimitIdentifier).catch((error: unknown) => {
      console.error('Password reset rate limit cleanup failed.', error);
    });
    return Response.json({ data: { passwordChanged: true } });
  } catch (error) {
    console.error('Password reset failed.', error);
    return Response.json(
      { error: 'The password could not be reset. Please request a new link.' },
      { status: 503 },
    );
  }
}
