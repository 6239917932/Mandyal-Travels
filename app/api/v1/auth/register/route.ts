import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { hashPassword } from '@/lib/auth/password';
import { getSafeReturnTo } from '@/lib/auth/redirect';
import {
  clearRateLimit,
  consumeRateLimit,
  getRequestRateLimitIdentifier,
} from '@/lib/auth/rateLimit';
import { createSession } from '@/lib/auth/session';
import { isValidEmail, isValidName, isValidPassword, normalizeEmail } from '@/lib/auth/validation';
import { prisma } from '@/lib/prisma';
import { hasPrismaErrorCode } from '@/lib/prismaErrors';

const REGISTRATION_ATTEMPT_LIMIT = 5;
const REGISTRATION_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body) {
    return NextResponse.json({ error: 'Enter valid account details.' }, { status: 400 });
  }
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
  const email = normalizeEmail(typeof body.email === 'string' ? body.email : '');
  const password = typeof body.password === 'string' ? body.password : '';
  const returnTo = getSafeReturnTo(body.returnTo);
  const accountType = body.accountType === 'business' ? 'business' : 'customer';
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
    !isValidPassword(password)
  ) {
    return NextResponse.json(
      {
        error: 'Enter a valid name, email address, and password between 10 and 128 characters.',
      },
      { status: 400 },
    );
  }

  if (
    accountType === 'business' &&
    (organizationName.length < 2 || organizationName.length > 120)
  ) {
    return NextResponse.json(
      { error: 'Enter an organization name between 2 and 120 characters.' },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { error: 'An account already exists for this email.' },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  let user;
  try {
    user = await prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          email,
          firstName,
          lastName,
          marketingConsentAt: body.marketingConsent === true ? new Date() : null,
          passwordHash,
          role: accountType === 'business' ? 'BUSINESS_ADMIN' : 'CUSTOMER',
        },
      });

      if (accountType === 'business') {
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
            type: 'CORPORATE',
          },
        });
      }

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
  await createSession(user.id);
  return NextResponse.json(
    {
      redirectTo: returnTo ?? (user.role === 'BUSINESS_ADMIN' ? '/business/dashboard' : '/account'),
      user: { email: user.email, firstName: user.firstName },
    },
    { status: 201 },
  );
}
