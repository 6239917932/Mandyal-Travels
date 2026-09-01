import { NextResponse } from 'next/server';

import { isTrustedPortalMutation } from '@/lib/api/portalOrigin';
import { readJsonObject } from '@/lib/api/request';
import { verifyPassword } from '@/lib/auth/password';
import { getAccountHomePath, getSafeReturnTo } from '@/lib/auth/redirect';
import {
  clearRateLimit,
  consumeRateLimit,
  getRequestRateLimitIdentifier,
} from '@/lib/auth/rateLimit';
import { AccountAccessDeniedError, createSession } from '@/lib/auth/session';
import { isValidEmail, isValidPassword, normalizeEmail } from '@/lib/auth/validation';
import { prisma } from '@/lib/prisma';
import { resolvePublicPortalOrigin } from '@/lib/url/publicOrigin';
import { verifyUserSecondFactor } from '@/services/mfaService';

const LOGIN_ATTEMPT_LIMIT = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  if (!isTrustedPortalMutation(request, resolvePublicPortalOrigin())) {
    return NextResponse.json(
      { error: 'This request must originate from the Mandyal Travels portal.' },
      { status: 403 },
    );
  }

  const body = await readJsonObject(request);
  if (!body) {
    return NextResponse.json({ error: 'Enter a valid sign-in request.' }, { status: 400 });
  }
  const email = normalizeEmail(typeof body.email === 'string' ? body.email : '');
  const password = typeof body.password === 'string' ? body.password : '';
  const returnTo = getSafeReturnTo(body.returnTo);
  try {
    const rateLimitIdentifier = getRequestRateLimitIdentifier(request, email || 'unknown');
    const rateLimit = await consumeRateLimit({
      action: 'LOGIN',
      identifier: rateLimitIdentifier,
      limit: LOGIN_ATTEMPT_LIMIT,
      windowMs: LOGIN_WINDOW_MS,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many sign-in attempts. Please wait before trying again.' },
        { headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) }, status: 429 },
      );
    }
    const validCredentials = isValidEmail(email) && isValidPassword(password);
    const user = validCredentials ? await prisma.user.findUnique({ where: { email } }) : null;

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: 'The email or password is incorrect.' }, { status: 401 });
    }
    if (user.accessStatus !== 'ACTIVE') {
      return NextResponse.json({ error: 'The email or password is incorrect.' }, { status: 401 });
    }

    const mfa = await prisma.userMfaCredential.findUnique({ where: { userId: user.id } });
    if (mfa?.enabledAt) {
      const mfaCode = typeof body.mfaCode === 'string' ? body.mfaCode : '';
      if (!mfaCode) {
        return NextResponse.json(
          { error: 'Enter your authenticator or recovery code.', mfaRequired: true },
          { status: 401 },
        );
      }
      if (!(await verifyUserSecondFactor(user.id, mfaCode))) {
        return NextResponse.json(
          { error: 'The authentication code is incorrect.', mfaRequired: true },
          { status: 401 },
        );
      }
    }

    await clearRateLimit('LOGIN', rateLimitIdentifier);
    await createSession(user.id);
    const agencyMembership =
      user.role === 'BUSINESS_ADMIN'
        ? await prisma.organizationMember.findFirst({
            where: { userId: user.id, organization: { type: 'TRAVEL_AGENCY' } },
          })
        : null;
    return NextResponse.json({
      redirectTo: returnTo ?? (agencyMembership ? '/agent' : getAccountHomePath(user.role)),
      user: { email: user.email, firstName: user.firstName },
    });
  } catch (error) {
    if (error instanceof AccountAccessDeniedError) {
      return NextResponse.json({ error: 'The email or password is incorrect.' }, { status: 401 });
    }
    console.error('Sign-in failed.', error);
    return NextResponse.json(
      { error: 'Sign-in is temporarily unavailable. Please try again.' },
      { status: 503 },
    );
  }
}
