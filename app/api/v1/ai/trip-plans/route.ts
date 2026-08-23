import { readJsonObject } from '@/lib/api/request';
import { aiTripPlannerService } from '@/services/aiTripPlannerService';
import { isPlatformFeatureEnabled } from '@/services/platformFeatureFlagService';
import type { TripPlannerInput } from '@/types/ai';

export async function POST(request: Request): Promise<Response> {
  if (!(await isPlatformFeatureEnabled('AI_TRIP_PLANNER'))) {
    return Response.json(
      { error: { code: 'FEATURE_PAUSED', message: 'Guided trip planning is temporarily paused.' } },
      { status: 503 },
    );
  }
  const body = await readJsonObject(request, 8 * 1024);
  if (!body)
    return Response.json(
      { error: { code: 'INVALID_JSON', message: 'Enter valid trip details.' } },
      { status: 400 },
    );
  try {
    const input: TripPlannerInput = {
      adults: Number(body.adults),
      checkInDate: String(body.checkInDate ?? ''),
      checkOutDate: String(body.checkOutDate ?? ''),
      destination: String(body.destination ?? ''),
      destinationAirport: String(body.destinationAirport ?? ''),
      interests: Array.isArray(body.interests)
        ? body.interests.filter((value): value is string => typeof value === 'string')
        : [],
      origin: String(body.origin ?? ''),
      originAirport: String(body.originAirport ?? ''),
    };
    return Response.json({
      data: aiTripPlannerService.plan(input, new Date().toISOString().slice(0, 10)),
    });
  } catch (error) {
    return Response.json(
      {
        error: {
          code: 'INVALID_TRIP_PLAN',
          message: error instanceof Error ? error.message : 'The trip plan could not be created.',
        },
      },
      { status: 400 },
    );
  }
}
