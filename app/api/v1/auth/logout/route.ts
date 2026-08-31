import { NextResponse } from 'next/server';

import { deleteCurrentSession, getCurrentSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { resolvePublicPortalOrigin } from '@/lib/url/publicOrigin';
import {
  ACCOUNT_SECURITY_ACTIONS,
  createAccountSecurityEventData,
} from '@/services/accountSecurityService';

export async function POST() {
  try {
    const currentSession = await getCurrentSession();
    await deleteCurrentSession();
    if (currentSession) {
      await prisma.accountSecurityEvent.create({
        data: createAccountSecurityEventData({
          action: ACCOUNT_SECURITY_ACTIONS.SIGNED_OUT,
          summary: 'The current browser session signed out.',
          userId: currentSession.user.id,
        }),
      });
    }
  } catch (error) {
    console.error('Session deletion failed during sign-out.', error);
  }
  return NextResponse.redirect(new URL('/', resolvePublicPortalOrigin()), 303);
}
