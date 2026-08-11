import { NextResponse } from 'next/server';

import { getCurrentSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import {
  ACCOUNT_SECURITY_ACTIONS,
  createAccountSecurityEventData,
} from '@/services/accountSecurityService';

export async function DELETE() {
  try {
    const currentSession = await getCurrentSession();
    if (!currentSession) {
      return NextResponse.json({ error: 'Sign in to manage active sessions.' }, { status: 401 });
    }

    const result = await prisma.$transaction(async (transaction) => {
      const revoked = await transaction.userSession.deleteMany({
        where: {
          id: { not: currentSession.id },
          userId: currentSession.user.id,
        },
      });
      await transaction.accountSecurityEvent.create({
        data: createAccountSecurityEventData({
          action: ACCOUNT_SECURITY_ACTIONS.OTHER_SESSIONS_REVOKED,
          summary: `${revoked.count} other browser session${revoked.count === 1 ? '' : 's'} signed out.`,
          userId: currentSession.user.id,
        }),
      });
      return revoked;
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
