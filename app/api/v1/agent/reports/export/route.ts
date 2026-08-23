import { getAgencyAdminAccess } from '@/lib/agentAuth';
import { prisma } from '@/lib/prisma';
import { exportLimitExceededResponse, MAX_EXPORT_ROWS } from '@/lib/reporting/exportLimit';
import { buildAgencyReportWhere, parseAgencyReportFilters } from '@/services/agencyReportService';
import { createCsv } from '@/utils/csv';

export async function GET(request: Request) {
  const access = await getAgencyAdminAccess();
  if (!access) {
    return Response.json(
      { error: 'Travel-agency administrator access is required.' },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const filters = parseAgencyReportFilters(Object.fromEntries(url.searchParams.entries()));
  const requests = await prisma.businessTravelRequest.findMany({
    include: {
      agencyCustomerLink: { include: { agencyCustomer: true } },
      customerTrip: { select: { confirmationCode: true } },
      hotelBooking: { select: { confirmationCode: true } },
      reviewedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: MAX_EXPORT_ROWS + 1,
    where: buildAgencyReportWhere(access.membership.organizationId, filters),
  });
  if (requests.length > MAX_EXPORT_ROWS) {
    return exportLimitExceededResponse(
      `This report contains more than ${MAX_EXPORT_ROWS.toLocaleString('en-IN')} rows. Narrow the customer, date, product, status, or search filters and export again.`,
    );
  }

  const header = [
    'Agency',
    'Customer',
    'Customer email',
    'Customer phone',
    'Customer status',
    'Request created',
    'Status',
    'Product',
    'Purpose or destination',
    'Start date',
    'End date',
    'Estimated amount',
    'Booked amount',
    'Currency',
    'Policy result',
    'Reviewed by',
    'Booking reference',
    'Booked at',
  ];
  const rows = requests.map((item) => {
    const customer = item.agencyCustomerLink?.agencyCustomer;
    return [
      access.organization.name,
      customer?.displayName ?? '',
      customer?.email ?? '',
      customer?.phone ?? '',
      customer?.status ?? '',
      item.createdAt.toISOString(),
      item.status,
      item.productType,
      item.title,
      item.startDate,
      item.endDate,
      item.estimatedAmount,
      item.bookingTotalAmount,
      item.currency,
      item.policyReason,
      item.reviewedBy ? `${item.reviewedBy.firstName} ${item.reviewedBy.lastName}` : '',
      item.customerTrip?.confirmationCode ?? item.hotelBooking?.confirmationCode ?? '',
      item.bookedAt?.toISOString() ?? '',
    ];
  });

  return new Response(createCsv([header, ...rows]), {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': 'attachment; filename="mandyal-agency-customer-report.csv"',
      'Content-Type': 'text/csv; charset=utf-8',
    },
  });
}
