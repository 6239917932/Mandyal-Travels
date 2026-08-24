import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { customerNotificationTitle } from '@/services/customerNotificationCenterService';

const MAX_EXPORT_RECORDS = 5000;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to download your account data.' }, { status: 401 });
  }

  const tripFilter = { OR: [{ userId: user.id }, { email: user.email }] };

  try {
    const exportData = await prisma.$transaction(async (tx) => {
      const recordCounts = await Promise.all([
        tx.customerTrip.count({ where: tripFilter }),
        tx.bookingGuest.count({ where: { email: user.email } }),
        tx.businessTravelRequest.count({ where: { requesterId: user.id } }),
        tx.customerSupportCase.count({ where: { userId: user.id } }),
        tx.customerSupportCaseEvent.count({
          where: { supportCase: { is: { userId: user.id } } },
        }),
        tx.accountSecurityEvent.count({ where: { userId: user.id } }),
        tx.notificationDelivery.count({ where: { userId: user.id } }),
        tx.loyaltyAccount.count({ where: { userId: user.id } }),
        tx.loyaltyLedger.count({ where: { account: { is: { userId: user.id } } } }),
        tx.referralCode.count({ where: { ownerUserId: user.id } }),
      ]);
      const exportRecordCount = recordCounts.reduce((total, count) => total + count, 0);
      if (exportRecordCount > MAX_EXPORT_RECORDS) {
        return null;
      }

      return Promise.all([
        tx.user.findUnique({ select: { createdAt: true }, where: { id: user.id } }),
        tx.customerTrip.findMany({
          orderBy: { createdAt: 'desc' },
          select: {
            confirmationCode: true,
            createdAt: true,
            currency: true,
            detailsJson: true,
            endDate: true,
            id: true,
            productType: true,
            startDate: true,
            status: true,
            subtitle: true,
            title: true,
            totalAmount: true,
            updatedAt: true,
          },
          take: MAX_EXPORT_RECORDS + 1,
          where: tripFilter,
        }),
        tx.bookingGuest.findMany({
          orderBy: { booking: { createdAt: 'desc' } },
          select: {
            booking: {
              select: {
                confirmationCode: true,
                createdAt: true,
                currency: true,
                hotelSlug: true,
                quote: {
                  select: { checkInDate: true, checkOutDate: true, ratePlanId: true },
                },
                status: true,
                totalAmount: true,
              },
            },
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
          take: MAX_EXPORT_RECORDS + 1,
          where: { email: user.email },
        }),
        tx.businessTravelRequest.findMany({
          orderBy: { createdAt: 'desc' },
          select: {
            bookedAt: true,
            bookingTotalAmount: true,
            createdAt: true,
            currency: true,
            endDate: true,
            estimatedAmount: true,
            id: true,
            organization: { select: { name: true } },
            policyReason: true,
            policySnapshotJson: true,
            productType: true,
            reviewNote: true,
            reviewedAt: true,
            startDate: true,
            status: true,
            title: true,
            updatedAt: true,
          },
          take: MAX_EXPORT_RECORDS + 1,
          where: { requesterId: user.id },
        }),
        tx.customerSupportCase.findMany({
          orderBy: { createdAt: 'desc' },
          select: {
            bookingReference: true,
            caseNumber: true,
            category: true,
            closedAt: true,
            createdAt: true,
            events: {
              orderBy: { createdAt: 'asc' },
              select: { action: true, createdAt: true, summary: true },
              take: MAX_EXPORT_RECORDS + 1,
            },
            message: true,
            resolutionNote: true,
            status: true,
            subject: true,
            updatedAt: true,
          },
          take: MAX_EXPORT_RECORDS + 1,
          where: { userId: user.id },
        }),
        tx.organizationMember.findFirst({
          select: {
            createdAt: true,
            organization: { select: { name: true, type: true } },
            role: true,
          },
          where: { userId: user.id },
        }),
        tx.accountSecurityEvent.findMany({
          orderBy: { createdAt: 'desc' },
          select: { action: true, createdAt: true, summary: true },
          take: MAX_EXPORT_RECORDS + 1,
          where: { userId: user.id },
        }),
        tx.notificationDelivery.findMany({
          orderBy: { createdAt: 'desc' },
          select: {
            channel: true,
            createdAt: true,
            deliveredAt: true,
            status: true,
            template: { select: { templateKey: true } },
            updatedAt: true,
          },
          take: MAX_EXPORT_RECORDS + 1,
          where: { userId: user.id },
        }),
        tx.loyaltyAccount.findUnique({
          select: {
            createdAt: true,
            entries: {
              orderBy: { createdAt: 'desc' },
              select: {
                createdAt: true,
                description: true,
                entryType: true,
                pointsDelta: true,
                walletCurrency: true,
                walletDelta: true,
              },
              take: MAX_EXPORT_RECORDS + 1,
            },
            pointsBalance: true,
            status: true,
            updatedAt: true,
            walletBalance: true,
            walletCurrency: true,
          },
          where: { userId: user.id },
        }),
        tx.referralCode.findMany({
          orderBy: { createdAt: 'desc' },
          select: {
            createdAt: true,
            expiresAt: true,
            maxUses: true,
            status: true,
            updatedAt: true,
            usedCount: true,
          },
          take: MAX_EXPORT_RECORDS + 1,
          where: { ownerUserId: user.id },
        }),
      ] as const);
    });

    if (!exportData) {
      return NextResponse.json(
        {
          error: `This account contains more than ${MAX_EXPORT_RECORDS.toLocaleString('en-IN')} export records. Contact support for a managed archive.`,
        },
        { headers: { 'Cache-Control': 'no-store' }, status: 409 },
      );
    }

    const [
      account,
      trips,
      hotelBookings,
      companyRequests,
      supportCases,
      membership,
      securityEvents,
      notificationHistory,
      loyaltyAccount,
      referralCodes,
    ] = exportData;

    const safeNotificationHistory = notificationHistory.map(({ template: _, ...delivery }) => ({
      ...delivery,
      description: customerNotificationTitle(_.templateKey),
    }));

    const exportedAt = new Date();
    const data = {
      account: {
        bookingEmailEnabled: user.bookingEmailEnabled,
        createdAt: account?.createdAt ?? null,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        marketingConsentAt: user.marketingConsentAt,
        role: user.role,
        smsAlertsEnabled: user.smsAlertsEnabled,
        whatsappAlertsEnabled: user.whatsappAlertsEnabled,
      },
      companyMembership: membership
        ? {
            joinedAt: membership.createdAt,
            organization: membership.organization,
            role: membership.role,
          }
        : null,
      companyTravelRequests: companyRequests,
      benefitsReadiness: { loyaltyAccount, referralCodes },
      exportedAt,
      hotelBookings,
      notificationHistory: safeNotificationHistory,
      securityActivity: securityEvents,
      supportCases,
      travelBookings: trips,
    };
    const date = exportedAt.toISOString().slice(0, 10);

    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="mandyal-account-data-${date}.json"`,
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Account data export failed.', error);
    return NextResponse.json(
      { error: 'Your account data could not be prepared. Please try again.' },
      { headers: { 'Cache-Control': 'no-store' }, status: 500 },
    );
  }
}
