import { getPartnerAccess } from '@/lib/partnerAuth';
import { hotelBookingService } from '@/services/hotelBookingService';
import type { ApiErrorResponse } from '@/types/commerce';

export async function GET(request: Request): Promise<Response> {
  const access = await getPartnerAccess(request);
  if (!access) {
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
  const [bookings, summary] = await Promise.all([
    hotelBookingService.listPartnerBookings({
      hotelSlugs: access.allowedHotelSlugs,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    hotelBookingService.getPartnerBookingSummary(access.allowedHotelSlugs),
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
