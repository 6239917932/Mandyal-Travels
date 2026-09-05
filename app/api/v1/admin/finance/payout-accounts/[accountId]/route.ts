import { getPlatformAdmin } from '@/lib/adminAuth';
import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { PartnerPayoutError, partnerPayoutService } from '@/services/partnerPayoutService';
import { normalizePayoutAccountReview } from '@/services/partnerPayoutRules';
import { isPlatformFeatureEnabled } from '@/services/platformFeatureFlagService';

type Context = { params: Promise<{ accountId: string }> };

export async function PATCH(request: Request, context: Context): Promise<Response> {
  if (!isSameOriginMutation(request))
    return Response.json({ error: { code: 'FORBIDDEN_ORIGIN' } }, { status: 403 });
  const admin = await getPlatformAdmin();
  if (!admin) return Response.json({ error: { code: 'ADMIN_UNAUTHORIZED' } }, { status: 401 });
  if (!(await isPlatformFeatureEnabled('PARTNER_PAYOUT_ONBOARDING')))
    return Response.json({ error: { code: 'PAYOUT_ONBOARDING_DISABLED' } }, { status: 409 });
  const body = await readJsonObject(request, 2048);
  const review = body ? normalizePayoutAccountReview(body) : null;
  if (!review) return Response.json({ error: { code: 'PAYOUT_REVIEW_INVALID' } }, { status: 400 });
  try {
    const account = await partnerPayoutService.reviewAccount({
      accountId: (await context.params).accountId,
      actorUserId: admin.id,
      ...review,
    });
    return Response.json({
      data: {
        id: account.id,
        isDefault: account.isDefault,
        status: account.status,
        version: account.version,
      },
    });
  } catch (error) {
    return error instanceof PartnerPayoutError
      ? Response.json({ error: { code: error.code, message: error.message } }, { status: 409 })
      : Response.json({ error: { code: 'PAYOUT_REVIEW_FAILED' } }, { status: 500 });
  }
}
