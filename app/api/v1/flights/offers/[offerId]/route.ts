import { flightService } from '@/services/flightService';
import { createFlightSearchCriteria } from '@/utils/flightSearchCriteria';

function searchParamsRecord(url: URL): Record<string, string> {
  return Object.fromEntries(url.searchParams.entries());
}

export async function GET(
  request: Request,
  context: { params: Promise<{ offerId: string }> },
): Promise<Response> {
  const { offerId } = await context.params;
  if (!offerId || offerId.length > 120) {
    return Response.json(
      { error: { code: 'INVALID_FLIGHT_OFFER', message: 'A valid flight offer is required.' } },
      { status: 400 },
    );
  }

  const criteria = createFlightSearchCriteria(searchParamsRecord(new URL(request.url)));
  try {
    const offer = await flightService.revalidateOffer(offerId, criteria);
    if (!offer) {
      return Response.json(
        {
          error: {
            code: 'FLIGHT_OFFER_UNAVAILABLE',
            message: 'The flight offer is no longer available for this itinerary.',
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
          code: 'INVALID_FLIGHT_SEARCH',
          message: cause instanceof Error ? cause.message : 'The flight search is invalid.',
        },
      },
      { status: 400 },
    );
  }
}
