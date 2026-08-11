import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import {
  clearRateLimit,
  consumeRateLimit,
  getRequestRateLimitIdentifier,
} from '@/lib/auth/rateLimit';
import { getCurrentUser, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { isValidPassword } from '@/lib/auth/validation';
import { prisma } from '@/lib/prisma';
import {
  ACCOUNT_SECURITY_ACTIONS,
  createAccountSecurityEventData,
} from '@/services/accountSecurityService';

const PASSWORD_CHANGE_ATTEMPT_LIMIT = 5;
const PASSWORD_CHANGE_WINDOW_MS = 15 * 60 * 1000;

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in to update your password.' }, { status: 401 });
    }

    const body = await readJsonObject(request);
    if (!body) {
      return NextResponse.json({ error: 'Enter valid password details.' }, { status: 400 });
    }

    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';
    if (!isValidPassword(currentPassword) || !isValidPassword(newPassword)) {
      return NextResponse.json(
        { error: 'Passwords must contain between 10 and 128 characters.' },
        { status: 400 },
      );
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'The new passwords do not match.' }, { status: 400 });
    }
    if (newPassword === currentPassword) {
      return NextResponse.json(
        { error: 'Choose a new password that is different from the current password.' },
        { status: 400 },
      );
    }

    const rateLimitIdentifier = getRequestRateLimitIdentifier(request, user.id);
    const rateLimit = await consumeRateLimit({
      action: 'PASSWORD_CHANGE',
      identifier: rateLimitIdentifier,
      limit: PASSWORD_CHANGE_ATTEMPT_LIMIT,
      windowMs: PASSWORD_CHANGE_WINDOW_MS,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many password attempts. Please wait before trying again.' },
        { headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) }, status: 429 },
      );
    }

    const account = await prisma.user.findUnique({
      select: { passwordHash: true },
      where: { id: user.id },
    });
    if (!account || !(await verifyPassword(currentPassword, account.passwordHash))) {
      return NextResponse.json({ error: 'The current password is incorrect.' }, { status: 401 });
    }

    await clearRateLimit('PASSWORD_CHANGE', rateLimitIdentifier);
    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.user.update({ data: { passwordHash }, where: { id: user.id } }),
      prisma.userSession.deleteMany({ where: { userId: user.id } }),
      prisma.accountSecurityEvent.create({
        data: createAccountSecurityEventData({
          action: ACCOUNT_SECURITY_ACTIONS.PASSWORD_CHANGED,
          summary: 'Your password changed and all browser sessions were signed out.',
          userId: user.id,
        }),
      }),
    ]);
    (await cookies()).delete(SESSION_COOKIE_NAME);

    return NextResponse.json({ data: { passwordChanged: true } });
  } catch (error) {
    console.error('Password update failed.', error);
    return NextResponse.json(
      { error: 'The password could not be updated. Please try again.' },
      { status: 503 },
    );
  }
}
