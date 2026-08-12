import { getPartnerAccess } from '@/lib/partnerAuth';
import { partnerOperationsService } from '@/services/partnerOperationsService';
import type { ApiErrorResponse } from '@/types/commerce';

export async function GET(request: Request): Promise<Response> {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'CAR') {
    return Response.json(
      {
        error: { code: 'PARTNER_UNAUTHORIZED', message: 'Car partner access is required.' },
      } satisfies ApiErrorResponse,
      { status: 401 },
    );
  }
  const partnerId = access.partnerId;
  const url = new URL(request.url);
  const requestedPage = Number(url.searchParams.get('page') ?? '1');
  const requestedPageSize = Number(url.searchParams.get('pageSize') ?? '50');
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize =
    Number.isInteger(requestedPageSize) && requestedPageSize > 0
      ? Math.min(requestedPageSize, 100)
      : 50;
  const [reservations, summary] = await Promise.all([
    partnerOperationsService.listVehicleReservations({
      partnerId,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    partnerOperationsService.getVehicleReservationSummary(partnerId),
  ]);
  return Response.json({
    data: reservations,
    meta: {
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(summary.totalCount / pageSize)),
      ...summary,
    },
  });
}
