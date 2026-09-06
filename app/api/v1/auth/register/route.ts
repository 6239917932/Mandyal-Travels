import { NextResponse } from 'next/server';

import { isTrustedPortalMutation } from '@/lib/api/portalOrigin';
import { readJsonObject } from '@/lib/api/request';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { getAccountHomePath, getSafeReturnTo } from '@/lib/auth/redirect';
import {
  clearRateLimit,
  consumeRateLimit,
  getRequestRateLimitIdentifier,
} from '@/lib/auth/rateLimit';
import { createSession } from '@/lib/auth/session';
import {
  isAcceptableNewPassword,
  isValidEmail,
  isValidName,
  normalizeEmail,
} from '@/lib/auth/validation';
import { prisma } from '@/lib/prisma';
import { PRIVACY_CONSENT_VERSION } from '@/lib/legal/policies';
import { hasPrismaErrorCode } from '@/lib/prismaErrors';
import { resolvePublicPortalOrigin } from '@/lib/url/publicOrigin';
import {
  ACCOUNT_SECURITY_ACTIONS,
  createAccountSecurityEventData,
} from '@/services/accountSecurityService';
import { isEmailOtpRequired, issueEmailOtp, verifyEmailOtp } from '@/services/emailOtpService';

const REGISTRATION_ATTEMPT_LIMIT = 5;
const REGISTRATION_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  if (!isTrustedPortalMutation(request, resolvePublicPortalOrigin())) {
    return NextResponse.json(
      { error: 'This request must originate from the Mandyal Travels portal.' },
      { status: 403 },
    );
  }

  const body = await readJsonObject(request);
  if (!body) {
    return NextResponse.json({ error: 'Enter valid account details.' }, { status: 400 });
  }
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
  const email = normalizeEmail(typeof body.email === 'string' ? body.email : '');
  const password = typeof body.password === 'string' ? body.password : '';
  const returnTo = getSafeReturnTo(body.returnTo);
  const accountType = ['agent', 'business'].includes(String(body.accountType))
    ? (body.accountType as 'agent' | 'business')
    : 'customer';
  const organizationName =
    typeof body.organizationName === 'string' ? body.organizationName.trim() : '';
  const rateLimitIdentifier = getRequestRateLimitIdentifier(request, email || 'unknown');
  const rateLimit = await consumeRateLimit({
    action: 'REGISTER',
    identifier: rateLimitIdentifier,
    limit: REGISTRATION_ATTEMPT_LIMIT,
    windowMs: REGISTRATION_WINDOW_MS,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many account creation attempts. Please wait before trying again.' },
      { headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) }, status: 429 },
    );
  }

  if (
    !isValidName(firstName) ||
    !isValidName(lastName) ||
    !isValidEmail(email) ||
    !isAcceptableNewPassword(password)
  ) {
    return NextResponse.json(
      {
        error:
          'Enter a valid name, email address, and an uncommon password between 10 and 128 characters.',
      },
      { status: 400 },
    );
  }

  if (
    ['agent', 'business'].includes(accountType) &&
    (organizationName.length < 2 || organizationName.length > 120)
  ) {
    return NextResponse.json(
      { error: 'Enter an organization name between 2 and 120 characters.' },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    if (
      isEmailOtpRequired() &&
      !existingUser.emailVerifiedAt &&
      (await verifyPassword(password, existingUser.passwordHash))
    ) {
      const challengeId =
        typeof body.emailOtpChallengeId === 'string' ? body.emailOtpChallengeId : '';
      const code = typeof body.emailOtpCode === 'string' ? body.emailOtpCode.trim() : '';
      if (!challengeId) {
        try {
          const challenge = await issueEmailOtp({
            email: existingUser.email,
            firstName: existingUser.firstName,
            purpose: 'REGISTRATION',
            userId: existingUser.id,
          });
          return NextResponse.json(
            {
              emailOtpChallengeId: challenge.challengeId,
              emailOtpRequired: true,
              message: 'Enter the six-digit code sent to your email address.',
            },
            { status: 202 },
          );
        } catch (error) {
          console.error('Registration email OTP could not be delivered.', error);
          return NextResponse.json(
            { error: 'A verification code could not be delivered. Please try again later.' },
            { status: 503 },
          );
        }
      }
      if (
        !(await verifyEmailOtp({
          challengeId,
          code,
          purpose: 'REGISTRATION',
          userId: existingUser.id,
        }))
      ) {
        return NextResponse.json(
          {
            emailOtpChallengeId: challengeId,
            emailOtpRequired: true,
            error: 'The email verification code is incorrect or expired.',
          },
          { status: 400 },
        );
      }
      await prisma.user.update({
        data: { emailVerifiedAt: new Date() },
        where: { id: existingUser.id },
      });
      await clearRateLimit('REGISTER', rateLimitIdentifier);
      await createSession(existingUser.id);
      return NextResponse.json(
        {
          redirectTo: returnTo ?? getAccountHomePath(existingUser.role),
          user: { email: existingUser.email, firstName: existingUser.firstName },
        },
        { status: 201 },
      );
    }
    return NextResponse.json(
      { error: 'An account already exists for this email.' },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  const marketingConsentGranted = body.marketingConsent === true;
  let user;
  try {
    user = await prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          email,
          firstName,
          lastName,
          marketingConsentAt: marketingConsentGranted ? new Date() : null,
          passwordHash,
          role: ['agent', 'business'].includes(accountType) ? 'BUSINESS_ADMIN' : 'CUSTOMER',
        },
      });

      if (['agent', 'business'].includes(accountType)) {
        await transaction.organization.create({
          data: {
            contactEmail: email,
            members: { create: { role: 'ADMIN', userId: createdUser.id } },
            name: organizationName,
            policyVersions: {
              create: {
                approvalRequired: true,
                createdByUserId: createdUser.id,
                defaultCabinClass: 'ECONOMY',
                maximumTripAmount: null,
                version: 1,
              },
            },
            type: accountType === 'agent' ? 'TRAVEL_AGENCY' : 'CORPORATE',
          },
        });
      }

      if (marketingConsentGranted) {
        await transaction.userConsentRecord.create({
          data: {
            userId: createdUser.id,
            purpose: 'MARKETING_COMMUNICATIONS',
            policyVersion: PRIVACY_CONSENT_VERSION,
            source: 'ACCOUNT_REGISTRATION',
            status: 'GRANTED',
          },
        });
      }

      await transaction.accountSecurityEvent.create({
        data: createAccountSecurityEventData({
          action: ACCOUNT_SECURITY_ACTIONS.ACCOUNT_CREATED,
          summary: `${accountType === 'agent' ? 'Travel agency administrator' : accountType === 'business' ? 'Business administrator' : 'Customer'} account created.`,
          userId: createdUser.id,
        }),
      });

      return createdUser;
    });
  } catch (error) {
    if (hasPrismaErrorCode(error, 'P2002')) {
      return NextResponse.json(
        { error: 'An account already exists for this email.' },
        { status: 409 },
      );
    }
    console.error('Account registration failed.', error);
    return NextResponse.json(
      { error: 'Your account could not be created. Please try again.' },
      { status: 500 },
    );
  }

  await clearRateLimit('REGISTER', rateLimitIdentifier);
  if (isEmailOtpRequired()) {
    try {
      const challenge = await issueEmailOtp({
        email: user.email,
        firstName: user.firstName,
        purpose: 'REGISTRATION',
        userId: user.id,
      });
      return NextResponse.json(
        {
          emailOtpChallengeId: challenge.challengeId,
          emailOtpRequired: true,
          message: 'Enter the six-digit code sent to your email address.',
        },
        { status: 202 },
      );
    } catch (error) {
      console.error('Registration email OTP could not be delivered.', error);
      return NextResponse.json(
        {
          error:
            'Your account was created, but a verification code could not be delivered. Try again later.',
        },
        { status: 503 },
      );
    }
  }
  await createSession(user.id);
  return NextResponse.json(
    {
      redirectTo: returnTo ?? (accountType === 'agent' ? '/agent' : getAccountHomePath(user.role)),
      user: { email: user.email, firstName: user.firstName },
    },
    { status: 201 },
  );
}
