import { carService } from '@/services/carService';
import { createCarSearchCriteria } from '@/utils/carSearchCriteria';

export async function GET(
  request: Request,
  context: { params: Promise<{ offerId: string }> },
): Promise<Response> {
  const { offerId } = await context.params;
  if (!offerId || offerId.length > 160) {
    return Response.json(
      { error: { code: 'INVALID_CAR_OFFER', message: 'A valid car offer is required.' } },
      { status: 400 },
    );
  }
  const criteria = createCarSearchCriteria(Object.fromEntries(new URL(request.url).searchParams));
  try {
    const offer = await carService.revalidateOffer(offerId, criteria);
    if (!offer) {
      return Response.json(
        {
          error: {
            code: 'CAR_OFFER_UNAVAILABLE',
            message: 'The car offer is no longer available for this rental.',
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
          code: 'INVALID_CAR_SEARCH',
          message: cause instanceof Error ? cause.message : 'The car search is invalid.',
        },
      },
      { status: 400 },
    );
  }
}
