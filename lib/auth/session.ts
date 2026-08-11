import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

import { prisma } from '@/lib/prisma';

export const SESSION_COOKIE_NAME = 'mandyal_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;
const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;
const MAX_ACTIVE_SESSIONS_PER_USER = 10;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const tokenHash = hashToken(token);

  await prisma.$transaction(async (transaction) => {
    await transaction.userSession.deleteMany({
      where: { expiresAt: { lte: new Date() }, userId },
    });
    await transaction.userSession.create({
      data: { expiresAt, tokenHash, userId },
    });
    const excessSessions = await transaction.userSession.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true },
      skip: MAX_ACTIVE_SESSIONS_PER_USER,
      where: { userId },
    });
    if (excessSessions.length > 0) {
      await transaction.userSession.deleteMany({
        where: { id: { in: excessSessions.map((session) => session.id) } },
      });
    }
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

  try {
    if (token) {
      await prisma.userSession.deleteMany({ where: { tokenHash: hashToken(token) } });
    }
  } finally {
    cookieStore.delete(SESSION_COOKIE_NAME);
  }
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.userSession.findUnique({
    include: {
      user: {
        select: {
          bookingEmailEnabled: true,
          email: true,
          firstName: true,
          id: true,
          lastName: true,
          marketingConsentAt: true,
          role: true,
          smsAlertsEnabled: true,
          whatsappAlertsEnabled: true,
        },
      },
    },
    where: { tokenHash: hashToken(token) },
  });

  if (!session) return null;

  const now = new Date();
  if (session.expiresAt <= now) {
    await prisma.userSession.deleteMany({ where: { id: session.id } });
    return null;
  }

  if (session.lastSeenAt.getTime() <= now.getTime() - SESSION_TOUCH_INTERVAL_MS) {
    await prisma.userSession.updateMany({
      data: { lastSeenAt: now },
      where: { id: session.id, lastSeenAt: session.lastSeenAt },
    });
  }
  return session.user;
}
