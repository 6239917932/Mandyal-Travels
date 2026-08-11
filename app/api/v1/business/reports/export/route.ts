import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { prisma } from '@/lib/prisma';
import {
  buildBusinessReportWhere,
  parseBusinessReportFilters,
} from '@/services/businessReportService';
import { createCsv } from '@/utils/csv';

export async function GET(request: Request) {
  const access = await getBusinessAdminMembership();
  if (!access) {
    return Response.json({ error: 'Business administrator access is required.' }, { status: 403 });
  }

  const url = new URL(request.url);
  const filters = parseBusinessReportFilters(Object.fromEntries(url.searchParams.entries()));
  const [organization, requests] = await Promise.all([
    prisma.organization.findUnique({
      select: { legalName: true, name: true, taxRegistrationId: true },
      where: { id: access.membership.organizationId },
    }),
    prisma.businessTravelRequest.findMany({
      include: {
        customerTrip: { select: { confirmationCode: true } },
        hotelBooking: { select: { confirmationCode: true } },
        requester: { select: { email: true, firstName: true, lastName: true } },
        reviewedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      where: buildBusinessReportWhere(access.membership.organizationId, filters),
    }),
  ]);
  if (!organization) {
    return Response.json({ error: 'The organization was not found.' }, { status: 404 });
  }

  const header = [
    'Organization',
    'GSTIN',
    'Request created',
    'Status',
    'Product',
    'Traveller',
    'Traveller email',
    'Purpose or destination',
    'Start date',
    'End date',
    'Estimated amount',
    'Booked amount',
    'Currency',
    'Policy result',
    'Reviewed by',
    'Review note',
    'Booking reference',
    'Booked at',
  ];
  const rows = requests.map((item) => [
    organization.legalName ?? organization.name,
    organization.taxRegistrationId,
    item.createdAt.toISOString(),
    item.status,
    item.productType,
    `${item.requester.firstName} ${item.requester.lastName}`,
    item.requester.email,
    item.title,
    item.startDate,
    item.endDate,
    item.estimatedAmount,
    item.bookingTotalAmount,
    item.currency,
    item.policyReason,
    item.reviewedBy ? `${item.reviewedBy.firstName} ${item.reviewedBy.lastName}` : '',
    item.reviewNote,
    item.customerTrip?.confirmationCode ?? item.hotelBooking?.confirmationCode ?? '',
    item.bookedAt?.toISOString() ?? '',
  ]);

  return new Response(createCsv([header, ...rows]), {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': 'attachment; filename="mandyal-company-travel-report.csv"',
      'Content-Type': 'text/csv; charset=utf-8',
    },
  });
}
