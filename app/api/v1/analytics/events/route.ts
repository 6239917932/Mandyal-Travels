import { getCurrentUser } from '@/lib/auth/session';
import { readJsonObject } from '@/lib/api/request';
import { consumeRateLimit, getRequestRateLimitIdentifier } from '@/lib/auth/rateLimit';
import { prisma } from '@/lib/prisma';

const EVENTS = new Set([
  'SEARCH_PERFORMED',
  'OFFER_VIEWED',
  'CHECKOUT_STARTED',
  'BOOKING_CONFIRMED',
  'SERVICING_OPENED',
]);
const PRODUCTS = new Set(['PLATFORM', 'HOTEL', 'FLIGHT', 'BUS', 'CAR']);
export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user)
    return Response.json(
      { error: { code: 'AUTH_REQUIRED', message: 'Sign in before recording account analytics.' } },
      { status: 401 },
    );
  const limit = await consumeRateLimit({
    action: 'ANALYTICS_EVENT',
    identifier: getRequestRateLimitIdentifier(request, user.id),
    limit: 120,
    windowMs: 60_000,
  });
  if (!limit.allowed)
    return Response.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many analytics events.' } },
      { headers: { 'Retry-After': String(limit.retryAfterSeconds) }, status: 429 },
    );
  const body = await readJsonObject(request);
  const eventName = typeof body?.eventName === 'string' ? body.eventName.toUpperCase() : '';
  const productType =
    typeof body?.productType === 'string' ? body.productType.toUpperCase() : 'PLATFORM';
  const funnelStage =
    typeof body?.funnelStage === 'string' ? body.funnelStage.trim().toUpperCase() : '';
  const entityRef = typeof body?.entityRef === 'string' ? body.entityRef.trim().slice(0, 100) : '';
  if (
    !EVENTS.has(eventName) ||
    !PRODUCTS.has(productType) ||
    !/^[A-Z][A-Z0-9_]{1,49}$/.test(funnelStage)
  )
    return Response.json(
      {
        error: {
          code: 'INVALID_ANALYTICS_EVENT',
          message: 'The analytics event is not supported.',
        },
      },
      { status: 400 },
    );
  const event = await prisma.analyticsEvent.create({
    data: { entityRef, eventName, funnelStage, productType, userId: user.id },
  });
  return Response.json({ data: { id: event.id } }, { status: 202 });
}
