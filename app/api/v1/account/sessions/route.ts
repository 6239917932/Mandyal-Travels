import { NextResponse } from 'next/server';

import { getCurrentSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export async function DELETE() {
  try {
    const currentSession = await getCurrentSession();
    if (!currentSession) {
      return NextResponse.json({ error: 'Sign in to manage active sessions.' }, { status: 401 });
    }

    const result = await prisma.userSession.deleteMany({
      where: {
        id: { not: currentSession.id },
        userId: currentSession.user.id,
      },
    });

    return NextResponse.json({ data: { revokedSessions: result.count } });
  } catch (error) {
    console.error('Session revocation failed.', error);
    return NextResponse.json(
      { error: 'Other sessions could not be signed out. Please try again.' },
      { status: 503 },
    );
  }
}
