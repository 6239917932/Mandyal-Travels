import { busService } from '@/services/busService';
import { createBusSearchCriteria } from '@/utils/busSearchCriteria';

export async function GET(request: Request): Promise<Response> {
  const criteria = createBusSearchCriteria(Object.fromEntries(new URL(request.url).searchParams));
  try {
    return Response.json(
      { data: { criteria, offers: await busService.search(criteria) } },
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
