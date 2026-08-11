import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

const PREFERENCE_KEYS = ['bookingEmail', 'marketingEmail', 'smsAlerts', 'whatsappAlerts'] as const;

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Sign in to update notification preferences.' },
        { status: 401 },
      );
    }

    const body = await readJsonObject(request);
    if (!body || PREFERENCE_KEYS.some((key) => typeof body[key] !== 'boolean')) {
      return NextResponse.json(
        { error: 'Select valid notification preferences.' },
        { status: 400 },
      );
    }

    const bookingEmail = body.bookingEmail as boolean;
    const marketingEmail = body.marketingEmail as boolean;
    const smsAlerts = body.smsAlerts as boolean;
    const whatsappAlerts = body.whatsappAlerts as boolean;
    await prisma.user.update({
      data: {
        bookingEmailEnabled: bookingEmail,
        marketingConsentAt: marketingEmail ? (user.marketingConsentAt ?? new Date()) : null,
        smsAlertsEnabled: smsAlerts,
        whatsappAlertsEnabled: whatsappAlerts,
      },
      where: { id: user.id },
    });

    return NextResponse.json({
      data: { bookingEmail, marketingEmail, smsAlerts, whatsappAlerts },
    });
  } catch (error) {
    console.error('Notification preference update failed.', error);
    return NextResponse.json(
      { error: 'Notification preferences could not be saved. Please try again.' },
      { status: 503 },
    );
  }
}
