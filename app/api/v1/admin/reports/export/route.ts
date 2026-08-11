import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { exportLimitExceededResponse, MAX_EXPORT_ROWS } from '@/lib/reporting/exportLimit';
import { createCsv } from '@/utils/csv';

function readDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
}

export async function GET(request: Request) {
  const administrator = await getPlatformAdmin();
  if (!administrator) {
    return Response.json({ error: 'Platform administrator access is required.' }, { status: 403 });
  }

  const url = new URL(request.url);
  const from = readDate(url.searchParams.get('from'));
  const to = readDate(url.searchParams.get('to'));
  const createdAt =
    from || to
      ? {
          ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
          ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
        }
      : undefined;

  const [hotelCount, tripCount] = await Promise.all([
    prisma.booking.count({ where: { createdAt } }),
    prisma.customerTrip.count({ where: { createdAt } }),
  ]);
  if (hotelCount + tripCount > MAX_EXPORT_ROWS) {
    return exportLimitExceededResponse(
      `This operations export contains more than ${MAX_EXPORT_ROWS.toLocaleString('en-IN')} rows. Add from and to dates to export a smaller period.`,
    );
  }

  const [hotelBookings, trips] = await Promise.all([
    prisma.booking.findMany({
      include: {
        businessTravelRequest: {
          select: { organization: { select: { name: true } } },
        },
        guest: { select: { email: true, firstName: true, lastName: true } },
        quote: { select: { checkInDate: true, checkOutDate: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_EXPORT_ROWS + 1,
      where: { createdAt },
    }),
    prisma.customerTrip.findMany({
      include: {
        businessTravelRequest: {
          select: { organization: { select: { name: true } } },
        },
        user: { select: { email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_EXPORT_ROWS + 1,
      where: { createdAt },
    }),
  ]);
  if (hotelBookings.length + trips.length > MAX_EXPORT_ROWS) {
    return exportLimitExceededResponse(
      `This operations export contains more than ${MAX_EXPORT_ROWS.toLocaleString('en-IN')} rows. Add from and to dates to export a smaller period.`,
    );
  }

  const header = [
    'Recorded at',
    'Booking reference',
    'Product',
    'Status',
    'Customer name',
    'Customer email',
    'Journey or property',
    'Start date',
    'End date',
    'Amount',
    'Currency',
    'Organization',
  ];
  const records = [
    ...hotelBookings.map((booking) => ({
      createdAt: booking.createdAt,
      row: [
        booking.createdAt.toISOString(),
        booking.confirmationCode,
        'HOTEL',
        booking.status,
        booking.guest ? `${booking.guest.firstName} ${booking.guest.lastName}` : '',
        booking.guest?.email ?? '',
        booking.hotelSlug,
        booking.quote.checkInDate,
        booking.quote.checkOutDate,
        booking.totalAmount,
        booking.currency,
        booking.businessTravelRequest?.organization.name ?? '',
      ],
    })),
    ...trips.map((trip) => ({
      createdAt: trip.createdAt,
      row: [
        trip.createdAt.toISOString(),
        trip.confirmationCode,
        trip.productType,
        trip.status,
        trip.user ? `${trip.user.firstName} ${trip.user.lastName}` : '',
        trip.user?.email ?? trip.email,
        trip.title,
        trip.startDate,
        trip.endDate,
        trip.totalAmount,
        trip.currency,
        trip.businessTravelRequest?.organization.name ?? '',
      ],
    })),
  ].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

  return new Response(createCsv([header, ...records.map((record) => record.row)]), {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': 'attachment; filename="mandyal-operations-travel-report.csv"',
      'Content-Type': 'text/csv; charset=utf-8',
    },
  });
}
