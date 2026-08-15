import { getPartnerAccess } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';
import { createCsv } from '@/utils/csv';

const EXPORT_LIMIT = 1_000;

export async function GET(request: Request) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'CAR')
    return Response.json(
      {
        error: {
          code: 'CAR_PARTNER_REQUIRED',
          message: 'An active car supplier account is required.',
        },
      },
      { status: 403 },
    );
  const totalCount = await prisma.partnerVehicleReservation.count({
    where: { partnerId: access.partnerId },
  });
  if (totalCount > EXPORT_LIMIT)
    return Response.json(
      {
        error: {
          code: 'EXPORT_LIMIT_EXCEEDED',
          message: `This export contains ${totalCount.toLocaleString('en-IN')} reservations. Use reporting filters before exporting more than ${EXPORT_LIMIT.toLocaleString('en-IN')} records.`,
        },
      },
      { headers: { 'Cache-Control': 'private, no-store' }, status: 422 },
    );
  const reservations = await prisma.partnerVehicleReservation.findMany({
    include: { vehicle: true },
    orderBy: { createdAt: 'desc' },
    take: EXPORT_LIMIT,
    where: { partnerId: access.partnerId },
  });
  const rows: Array<Array<string | number | null>> = [
    [
      'Confirmation code',
      'Status',
      'Driver or lead traveller',
      'Customer email',
      'Vehicle',
      'Registration',
      'Pickup location',
      'Drop-off location',
      'Pickup date',
      'Drop-off date',
      'Units',
      'Currency',
      'Total amount',
      'Created at',
    ],
  ];
  for (const reservation of reservations)
    rows.push([
      reservation.confirmationCode,
      reservation.status,
      reservation.customerName,
      reservation.customerEmail,
      reservation.vehicle.vehicleName,
      reservation.vehicle.registrationNumber,
      reservation.vehicle.pickupLocation,
      reservation.vehicle.dropoffLocation,
      reservation.pickupDate,
      reservation.dropoffDate,
      reservation.units,
      reservation.currency,
      reservation.totalAmount,
      reservation.createdAt.toISOString(),
    ]);
  return new Response(`${createCsv(rows)}\r\n`, {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="car-reservations-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Content-Type': 'text/csv; charset=utf-8',
      'X-Export-Limit': String(EXPORT_LIMIT),
    },
  });
}
