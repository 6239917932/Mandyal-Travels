import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { consumeRateLimit, getRequestRateLimitIdentifier } from '@/lib/auth/rateLimit';
import { getCurrentUser } from '@/lib/auth/session';
import {
  acceptPartnerAgreement,
  PartnerEnrollmentError,
} from '@/services/partnerEnrollmentService';
import { isPlatformFeatureEnabled } from '@/services/platformFeatureFlagService';
import type { ApiErrorResponse } from '@/types/commerce';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

export async function POST(request: Request) {
  if (!isSameOriginMutation(request))
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels portal.', 403);
  if (!(await isPlatformFeatureEnabled('PAID_PARTNER_ONBOARDING')))
    return failure('FEATURE_PAUSED', 'Paid supplier enrollment is not active yet.', 503);
  const user = await getCurrentUser();
  if (!user) return failure('AUTH_REQUIRED', 'Sign in before accepting the agreement.', 401);
  const rateLimit = await consumeRateLimit({
    action: 'PARTNER_AGREEMENT_ACCEPT',
    identifier: getRequestRateLimitIdentifier(request, user.id),
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed)
    return Response.json(
      { error: { code: 'RATE_LIMITED', message: 'Please wait before trying again.' } },
      { headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) }, status: 429 },
    );
  const body = await readJsonObject(request);
  if (
    !body ||
    body.explicitAcceptance !== true ||
    typeof body.acceptedName !== 'string' ||
    typeof body.agreementVersion !== 'string' ||
    typeof body.phoneVerificationRef !== 'string'
  ) {
    return failure(
      'EXPLICIT_ACCEPTANCE_REQUIRED',
      'Confirm the exact agreement version using your verified phone.',
      400,
    );
  }
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  try {
    const acceptance = await acceptPartnerAgreement({
      acceptedName: body.acceptedName,
      agreementVersion: body.agreementVersion.trim().slice(0, 80),
      ipAddress: forwarded || request.headers.get('cf-connecting-ip') || 'unavailable',
      phoneVerificationRef: body.phoneVerificationRef.trim().slice(0, 200),
      userAgent: request.headers.get('user-agent')?.slice(0, 500) || 'unavailable',
      userId: user.id,
    });
    return Response.json({ data: { acceptedAt: acceptance.acceptedAt, id: acceptance.id } });
  } catch (error) {
    return error instanceof PartnerEnrollmentError
      ? failure(error.code, error.message, 409)
      : failure('AGREEMENT_ACCEPTANCE_FAILED', 'Agreement acceptance could not be recorded.', 500);
  }
}
