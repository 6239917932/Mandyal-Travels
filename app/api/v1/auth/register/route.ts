import { NextResponse } from 'next/server';

import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { EMAIL_PATTERN, isValidPassword, normalizeEmail } from '@/lib/auth/validation';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
  const email = normalizeEmail(typeof body.email === 'string' ? body.email : '');
  const password = typeof body.password === 'string' ? body.password : '';

  if (!firstName || !lastName || !EMAIL_PATTERN.test(email) || !isValidPassword(password)) {
    return NextResponse.json(
      { error: 'Enter your name, a valid email, and a password of at least 10 characters.' },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: 'An account already exists for this email.' }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      email,
      firstName,
      lastName,
      marketingConsentAt: body.marketingConsent === true ? new Date() : null,
      passwordHash: await hashPassword(password),
    },
  });

  await createSession(user.id);
  return NextResponse.json({ user: { email: user.email, firstName: user.firstName } }, { status: 201 });
}
