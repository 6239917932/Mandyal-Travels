import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { verifyPassword } from '@/lib/auth/password';
import { getSafeReturnTo } from '@/lib/auth/redirect';
import { createSession } from '@/lib/auth/session';
import { EMAIL_PATTERN, isValidPassword, normalizeEmail } from '@/lib/auth/validation';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body) {
    return NextResponse.json({ error: 'Enter a valid sign-in request.' }, { status: 400 });
  }
  const email = normalizeEmail(typeof body.email === 'string' ? body.email : '');
  const password = typeof body.password === 'string' ? body.password : '';
  const returnTo = getSafeReturnTo(body.returnTo);
  const validCredentials = EMAIL_PATTERN.test(email) && isValidPassword(password);
  const user = validCredentials ? await prisma.user.findUnique({ where: { email } }) : null;

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: 'The email or password is incorrect.' }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({
    redirectTo: returnTo ?? (user.role === 'BUSINESS_ADMIN' ? '/business/dashboard' : '/account'),
    user: { email: user.email, firstName: user.firstName },
  });
}
