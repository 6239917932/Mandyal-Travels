import { busService } from '@/services/busService';
import { createBusSearchCriteria } from '@/utils/busSearchCriteria';

export async function GET(
  request: Request,
  context: { params: Promise<{ offerId: string }> },
): Promise<Response> {
  const { offerId } = await context.params;
  if (!offerId || offerId.length > 120) {
    return Response.json(
      { error: { code: 'INVALID_BUS_OFFER', message: 'A valid bus offer is required.' } },
      { status: 400 },
    );
  }
  const criteria = createBusSearchCriteria(Object.fromEntries(new URL(request.url).searchParams));
  try {
    const offer = await busService.revalidateOffer(offerId, criteria);
    if (!offer) {
      return Response.json(
        {
          error: {
            code: 'BUS_OFFER_UNAVAILABLE',
            message: 'The bus offer is no longer available for this journey.',
          },
        },
        { status: 404 },
      );
    }
    return Response.json(
      { data: { criteria, offer } },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (cause: unknown) {
    return Response.json(
      {
        error: {
          code: 'INVALID_BUS_SEARCH',
          message: cause instanceof Error ? cause.message : 'The bus search is invalid.',
        },
      },
      { status: 400 },
    );
  }
}
