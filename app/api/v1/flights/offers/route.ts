import { flightService } from '@/services/flightService';
import { createFlightSearchCriteria } from '@/utils/flightSearchCriteria';

function searchParamsRecord(url: URL): Record<string, string> {
  return Object.fromEntries(url.searchParams.entries());
}

export async function GET(request: Request): Promise<Response> {
  const criteria = createFlightSearchCriteria(searchParamsRecord(new URL(request.url)));
  try {
    const offers = await flightService.search(criteria);
    return Response.json(
      { data: { criteria, offers } },
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
