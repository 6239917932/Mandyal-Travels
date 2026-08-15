import { getPartnerAccess } from '@/lib/partnerAuth';
import { hotelBookingService } from '@/services/hotelBookingService';
import type { ApiErrorResponse } from '@/types/commerce';

export async function GET(request: Request): Promise<Response> {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL') {
    return Response.json(
      {
        error: { code: 'PARTNER_UNAUTHORIZED', message: 'Partner access is required.' },
      } satisfies ApiErrorResponse,
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const requestedPage = Number(url.searchParams.get('page') ?? '1');
  const requestedPageSize = Number(url.searchParams.get('pageSize') ?? '50');
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize =
    Number.isInteger(requestedPageSize) && requestedPageSize > 0
      ? Math.min(requestedPageSize, 100)
      : 50;
  const query = (url.searchParams.get('query') ?? '').trim().slice(0, 120);
  const requestedBookingStatus = url.searchParams.get('bookingStatus');
  const bookingStatus = ['confirmed', 'cancelled'].includes(requestedBookingStatus ?? '')
    ? (requestedBookingStatus as 'confirmed' | 'cancelled')
    : undefined;
  const requestedStayStatus = url.searchParams.get('stayStatus');
  const stayStatus = ['RESERVED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW'].includes(requestedStayStatus ?? '')
    ? (requestedStayStatus as 'RESERVED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW')
    : undefined;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const requestedArrivalFrom = url.searchParams.get('arrivalFrom') ?? '';
  const requestedArrivalThrough = url.searchParams.get('arrivalThrough') ?? '';
  const arrivalFrom = datePattern.test(requestedArrivalFrom) ? requestedArrivalFrom : undefined;
  const arrivalThrough = datePattern.test(requestedArrivalThrough) ? requestedArrivalThrough : undefined;
  if (arrivalFrom && arrivalThrough && arrivalFrom > arrivalThrough) {
    return Response.json(
      { error: { code: 'INVALID_ARRIVAL_RANGE', message: 'Arrival end date must be on or after the start date.' } } satisfies ApiErrorResponse,
      { status: 400 },
    );
  }
  const filters = {
    arrivalFrom,
    arrivalThrough,
    bookingStatus,
    hotelSlugs: access.allowedHotelSlugs,
    operationalStatus: stayStatus,
    query: query || undefined,
  };
  const [bookings, summary] = await Promise.all([
    hotelBookingService.listPartnerBookings({
      ...filters,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    hotelBookingService.getPartnerBookingSummary(filters),
  ]);

  return Response.json({
    data: bookings,
    meta: {
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(summary.totalCount / pageSize)),
      ...summary,
    },
  });
}
