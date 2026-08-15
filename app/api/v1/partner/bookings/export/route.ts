import { getPartnerAccess } from '@/lib/partnerAuth';
import { hotelBookingService } from '@/services/hotelBookingService';
import type { PartnerBookingRecord } from '@/types/commerce';

const EXPORT_LIMIT = 1_000;

function csvValue(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function bookingRow(booking: PartnerBookingRecord): Array<string | number> {
  return [
    booking.confirmationCode,
    booking.hotelName,
    booking.guestName,
    booking.guestEmail,
    booking.checkInDate,
    booking.checkOutDate,
    booking.roomName,
    booking.ratePlanName,
    booking.rooms,
    booking.status,
    booking.operationalStatus,
    booking.paymentStatus,
    booking.currency,
    booking.totalAmount,
    booking.createdAt,
  ];
}

export async function GET(request: Request): Promise<Response> {
  const access = await getPartnerAccess(request);
  if (!access || access.partnerType !== 'HOTEL') {
    return Response.json(
      { error: { code: 'PARTNER_UNAUTHORIZED', message: 'Hotel partner access is required.' } },
      { status: 401 },
    );
  }
  const bookings = await hotelBookingService.listPartnerBookings({
    hotelSlugs: access.allowedHotelSlugs,
    skip: 0,
    take: EXPORT_LIMIT,
  });
  const header = [
    'Confirmation code', 'Hotel', 'Guest name', 'Guest email', 'Check-in', 'Check-out',
    'Room type', 'Rate plan', 'Rooms', 'Booking status', 'Stay status', 'Payment status',
    'Currency', 'Total amount', 'Created at',
  ];
  const csv = [header, ...bookings.map(bookingRow)]
    .map((row) => row.map(csvValue).join(','))
    .join('\r\n');
  return new Response(`\uFEFF${csv}\r\n`, {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="hotel-bookings-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Content-Type': 'text/csv; charset=utf-8',
      'X-Export-Limit': String(EXPORT_LIMIT),
    },
  });
}
