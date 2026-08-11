import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

const MAX_EXPORT_RECORDS = 5000;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to download your account data.' }, { status: 401 });
  }

  const tripFilter = { OR: [{ userId: user.id }, { email: user.email }] };

  try {
    const [tripCount, hotelCount, requestCount, supportCount] = await Promise.all([
      prisma.customerTrip.count({ where: tripFilter }),
      prisma.bookingGuest.count({ where: { email: user.email } }),
      prisma.businessTravelRequest.count({ where: { requesterId: user.id } }),
      prisma.customerSupportCase.count({ where: { userId: user.id } }),
    ]);
    const exportRecordCount = tripCount + hotelCount + requestCount + supportCount;
    if (exportRecordCount > MAX_EXPORT_RECORDS) {
      return NextResponse.json(
        {
          error: `This account contains more than ${MAX_EXPORT_RECORDS.toLocaleString('en-IN')} export records. Contact support for a managed archive.`,
        },
        { headers: { 'Cache-Control': 'no-store' }, status: 409 },
      );
    }

    const [account, trips, hotelBookings, companyRequests, supportCases, membership] =
      await Promise.all([
      prisma.user.findUnique({ select: { createdAt: true }, where: { id: user.id } }),
      prisma.customerTrip.findMany({
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
        where: tripFilter,
      }),
      prisma.bookingGuest.findMany({
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
        where: { email: user.email },
      }),
      prisma.businessTravelRequest.findMany({
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
        where: { requesterId: user.id },
      }),
      prisma.customerSupportCase.findMany({
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
          },
          message: true,
          resolutionNote: true,
          status: true,
          subject: true,
          updatedAt: true,
        },
        where: { userId: user.id },
      }),
      prisma.organizationMember.findFirst({
        select: {
          createdAt: true,
          organization: { select: { name: true, type: true } },
          role: true,
        },
        where: { userId: user.id },
      }),
    ]);

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
      exportedAt,
      hotelBookings,
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
