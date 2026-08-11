import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { prisma } from '@/lib/prisma';
import { createCsv } from '@/utils/csv';

export async function GET() {
  const access = await getBusinessAdminMembership();
  if (!access) {
    return Response.json({ error: 'Business administrator access is required.' }, { status: 403 });
  }

  const requests = await prisma.businessTravelRequest.findMany({
    include: {
      customerTrip: { select: { confirmationCode: true } },
      hotelBooking: { select: { confirmationCode: true } },
      requester: { select: { email: true, firstName: true, lastName: true } },
    },
    orderBy: { bookedAt: 'desc' },
    where: { organizationId: access.membership.organizationId, status: 'BOOKED' },
  });

  const header = [
    'Booking reference',
    'Product',
    'Traveller',
    'Traveller email',
    'Purpose or destination',
    'Start date',
    'End date',
    'Booked amount',
    'Currency',
    'Booked at',
  ];
  const rows = requests.map((request) => [
    request.customerTrip?.confirmationCode ?? request.hotelBooking?.confirmationCode ?? '',
    request.productType,
    `${request.requester.firstName} ${request.requester.lastName}`,
    request.requester.email,
    request.title,
    request.startDate,
    request.endDate,
    request.bookingTotalAmount,
    request.currency,
    request.bookedAt?.toISOString() ?? '',
  ]);
  const csv = createCsv([header, ...rows]);

  return new Response(csv, {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': 'attachment; filename="mandyal-company-bookings.csv"',
      'Content-Type': 'text/csv; charset=utf-8',
    },
  });
}
