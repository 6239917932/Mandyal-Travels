import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { consumeRateLimit, getRequestRateLimitIdentifier } from '@/lib/auth/rateLimit';
import { hotelDiscoveryService } from '@/services/hotelDiscoveryService';

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginMutation(request)) {
    return Response.json(
      { error: { code: 'FORBIDDEN_ORIGIN', message: 'Use the Mandyal Travels portal.' } },
      { status: 403 },
    );
  }
  const rateLimit = await consumeRateLimit({
    action: 'HOTEL_DISCOVERY',
    identifier: getRequestRateLimitIdentifier(request, 'public'),
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return Response.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many hotel discovery requests.' } },
      { headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) }, status: 429 },
    );
  }

  const body = await readJsonObject(request, 4 * 1024);
  const intent = typeof body?.intent === 'string' ? body.intent.trim() : '';
  if (intent.length < 3 || intent.length > 300) {
    return Response.json(
      {
        error: {
          code: 'INVALID_TRAVEL_INTENT',
          message: 'Describe the stay you want in 3 to 300 characters.',
        },
      },
      { status: 400 },
    );
  }
  return Response.json({ data: await hotelDiscoveryService.interpret(intent) });
}
