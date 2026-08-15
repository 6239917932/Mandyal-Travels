import { getPartnerAccess } from '@/lib/partnerAuth';
import { hotelBookingService } from '@/services/hotelBookingService';
import type { PartnerBookingRecord } from '@/types/commerce';
import { createCsv } from '@/utils/csv';

const EXPORT_LIMIT = 1_000;

function bookingRow(booking: PartnerBookingRecord): Array<string | number> {
  return [
    booking.confirmationCode,
    booking.hotelName,
    booking.guestName,
    booking.guestEmail,
    booking.checkInDate,
    booking.checkOutDate,
    booking.roomName,
    booking.assignedRoomNumbers.join(' | '),
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
  const url = new URL(request.url);
  const query = (url.searchParams.get('query') ?? '').trim().slice(0, 120);
  const requestedBookingStatus = url.searchParams.get('bookingStatus');
  const bookingStatus = ['confirmed', 'cancelled'].includes(requestedBookingStatus ?? '')
    ? (requestedBookingStatus as 'confirmed' | 'cancelled')
    : undefined;
  const requestedStayStatus = url.searchParams.get('stayStatus');
  const operationalStatus = ['RESERVED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW'].includes(
    requestedStayStatus ?? '',
  )
    ? (requestedStayStatus as 'RESERVED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW')
    : undefined;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const requestedArrivalFrom = url.searchParams.get('arrivalFrom') ?? '';
  const requestedArrivalThrough = url.searchParams.get('arrivalThrough') ?? '';
  const arrivalFrom = datePattern.test(requestedArrivalFrom) ? requestedArrivalFrom : undefined;
  const arrivalThrough = datePattern.test(requestedArrivalThrough)
    ? requestedArrivalThrough
    : undefined;
  if (arrivalFrom && arrivalThrough && arrivalFrom > arrivalThrough) {
    return Response.json(
      {
        error: {
          code: 'INVALID_ARRIVAL_RANGE',
          message: 'Arrival end date must be on or after the start date.',
        },
      },
      { status: 400 },
    );
  }
  const filters = {
    arrivalFrom,
    arrivalThrough,
    bookingStatus,
    hotelSlugs: access.allowedHotelSlugs,
    operationalStatus,
    query: query || undefined,
  };
  const summary = await hotelBookingService.getPartnerBookingSummary(filters);
  if (summary.totalCount > EXPORT_LIMIT) {
    return Response.json(
      {
        error: {
          code: 'EXPORT_LIMIT_EXCEEDED',
          message: `This export contains ${summary.totalCount.toLocaleString('en-IN')} bookings. Narrow the filters to ${EXPORT_LIMIT.toLocaleString('en-IN')} or fewer records.`,
        },
      },
      { headers: { 'Cache-Control': 'private, no-store' }, status: 422 },
    );
  }
  const bookings = await hotelBookingService.listPartnerBookings({
    ...filters,
    skip: 0,
    take: EXPORT_LIMIT,
  });
  const header = [
    'Confirmation code',
    'Hotel',
    'Guest name',
    'Guest email',
    'Check-in',
    'Check-out',
    'Room type',
    'Assigned physical rooms',
    'Rate plan',
    'Rooms',
    'Booking status',
    'Stay status',
    'Payment status',
    'Currency',
    'Total amount',
    'Created at',
  ];
  const csv = createCsv([header, ...bookings.map(bookingRow)]);
  return new Response(`${csv}\r\n`, {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="hotel-bookings-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Content-Type': 'text/csv; charset=utf-8',
      'X-Export-Limit': String(EXPORT_LIMIT),
    },
  });
}
