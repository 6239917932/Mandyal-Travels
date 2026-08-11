import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { hashPassword } from '@/lib/auth/password';
import { getSafeReturnTo } from '@/lib/auth/redirect';
import { createSession } from '@/lib/auth/session';
import { EMAIL_PATTERN, isValidPassword, normalizeEmail } from '@/lib/auth/validation';
import { prisma } from '@/lib/prisma';
import { hasPrismaErrorCode } from '@/lib/prismaErrors';

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

  if (!firstName || !lastName || !EMAIL_PATTERN.test(email) || !isValidPassword(password)) {
    return NextResponse.json(
      { error: 'Enter your name, a valid email, and a password of at least 10 characters.' },
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

  await createSession(user.id);
  return NextResponse.json(
    {
      redirectTo: returnTo ?? (user.role === 'BUSINESS_ADMIN' ? '/business/dashboard' : '/account'),
      user: { email: user.email, firstName: user.firstName },
    },
    { status: 201 },
  );
}