import { carService } from '@/services/carService';
import { createCarSearchCriteria } from '@/utils/carSearchCriteria';

export async function GET(request: Request): Promise<Response> {
  const criteria = createCarSearchCriteria(Object.fromEntries(new URL(request.url).searchParams));
  try {
    return Response.json(
      { data: { criteria, offers: await carService.search(criteria) } },
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
