import { getPartnerAccess } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';
import { createCsv } from '@/utils/csv';

const EXPORT_LIMIT = 1_000;

export async function GET(request: Request) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'BUS')
    return Response.json(
      { error: { code: 'BUS_PARTNER_REQUIRED', message: 'An active bus operator account is required.' } },
      { status: 403 },
    );
  const totalCount = await prisma.partnerBusReservation.count({ where: { partnerId: access.partnerId } });
  if (totalCount > EXPORT_LIMIT)
    return Response.json(
      { error: { code: 'EXPORT_LIMIT_EXCEEDED', message: `This export contains ${totalCount.toLocaleString('en-IN')} reservations. Use reporting filters before exporting more than ${EXPORT_LIMIT.toLocaleString('en-IN')} records.` } },
      { headers: { 'Cache-Control': 'private, no-store' }, status: 422 },
    );
  const reservations = await prisma.partnerBusReservation.findMany({
    include: { trip: { include: { route: true } } },
    orderBy: { createdAt: 'desc' },
    take: EXPORT_LIMIT,
    where: { partnerId: access.partnerId },
  });
  const rows: Array<Array<string | number>> = [[
    'Confirmation code', 'Status', 'Passenger name', 'Passenger email', 'Passengers', 'Seats',
    'Origin', 'Destination', 'Service date', 'Departure', 'Arrival', 'Bus type', 'Currency',
    'Total amount', 'Created at',
  ]];
  for (const reservation of reservations) {
    let seatNumbers = '';
    try {
      const parsed: unknown = JSON.parse(reservation.seatNumbersJson);
      seatNumbers = Array.isArray(parsed)
        ? parsed.filter((seat): seat is string => typeof seat === 'string').join(' | ')
        : '';
    } catch {
      seatNumbers = '';
    }
    rows.push([
      reservation.confirmationCode, reservation.status, reservation.customerName,
      reservation.customerEmail, reservation.passengerCount, seatNumbers,
      reservation.trip.route.origin, reservation.trip.route.destination,
      reservation.trip.serviceDate, reservation.trip.departureTime, reservation.trip.arrivalTime,
      reservation.trip.busType, reservation.currency, reservation.totalAmount,
      reservation.createdAt.toISOString(),
    ]);
  }
  return new Response(`${createCsv(rows)}\r\n`, {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="bus-reservations-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Content-Type': 'text/csv; charset=utf-8',
      'X-Export-Limit': String(EXPORT_LIMIT),
    },
  });
}
