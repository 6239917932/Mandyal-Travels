import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { consumeRateLimit, getRequestRateLimitIdentifier } from '@/lib/auth/rateLimit';
import { getCurrentUser } from '@/lib/auth/session';
import { resolvePublicPortalOrigin } from '@/lib/url/publicOrigin';
import {
  createPartnerOnboardingCheckout,
  PartnerEnrollmentError,
} from '@/services/partnerEnrollmentService';
import { isPlatformFeatureEnabled } from '@/services/platformFeatureFlagService';
import type { ApiErrorResponse } from '@/types/commerce';

export const runtime = 'nodejs';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

export async function POST(request: Request) {
  if (!isSameOriginMutation(request))
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels portal.', 403);
  if (!(await isPlatformFeatureEnabled('PAID_PARTNER_ONBOARDING')))
    return failure('FEATURE_PAUSED', 'Paid supplier enrollment is not active yet.', 503);
  const user = await getCurrentUser();
  if (!user) return failure('AUTH_REQUIRED', 'Sign in before starting supplier enrollment.', 401);
  const rateLimit = await consumeRateLimit({
    action: 'PARTNER_ONBOARDING_CHECKOUT',
    identifier: getRequestRateLimitIdentifier(request, user.id),
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed)
    return Response.json(
      { error: { code: 'RATE_LIMITED', message: 'Please wait before creating another checkout.' } },
      { headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) }, status: 429 },
    );
  const body = await readJsonObject(request);
  if (!body || typeof body.idempotencyKey !== 'string')
    return failure('INVALID_CHECKOUT', 'A secure checkout retry key is required.', 400);
  try {
    const order = await createPartnerOnboardingCheckout({
      couponCode: typeof body.couponCode === 'string' ? body.couponCode : undefined,
      idempotencyKey: body.idempotencyKey,
      returnUrl: new URL('/partners/apply?paymentReturn=1', resolvePublicPortalOrigin()).toString(),
      userId: user.id,
    });
    return Response.json({
      data: {
        checkoutUrl: order.checkoutUrl || null,
        currency: order.currency,
        discountAmount: order.discountAmount,
        dueNowAmount: order.dueNowAmount,
        orderId: order.id,
        status: order.status,
      },
    });
  } catch (error) {
    return error instanceof PartnerEnrollmentError
      ? failure(error.code, error.message, 409)
      : failure('CHECKOUT_FAILED', 'The supplier checkout could not be created.', 500);
  }
}
