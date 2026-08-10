import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

import { prisma } from '@/lib/prisma';

export const SESSION_COOKIE_NAME = 'mandyal_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.userSession.create({
    data: { expiresAt, tokenHash: hashToken(token), userId },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    expires: expiresAt,
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.userSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.userSession.findUnique({
    include: {
      user: {
        select: { email: true, firstName: true, id: true, lastName: true, role: true },
      },
    },
    where: { tokenHash: hashToken(token) },
  });

  if (!session || session.expiresAt <= new Date()) return null;
  return session.user;
}
