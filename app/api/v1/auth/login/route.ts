import { NextResponse } from 'next/server';

import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { normalizeEmail } from '@/lib/auth/validation';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const email = normalizeEmail(typeof body.email === 'string' ? body.email : '');
  const password = typeof body.password === 'string' ? body.password : '';
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: 'The email or password is incorrect.' }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ user: { email: user.email, firstName: user.firstName } });
}
