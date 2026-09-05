import { getPlatformAdmin } from '@/lib/adminAuth';
import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { hasPrismaErrorCode } from '@/lib/prismaErrors';
import { PartnerPayoutError, partnerPayoutService } from '@/services/partnerPayoutService';
import { isPlatformFeatureEnabled } from '@/services/platformFeatureFlagService';

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginMutation(request))
    return Response.json({ error: { code: 'FORBIDDEN_ORIGIN' } }, { status: 403 });
  const admin = await getPlatformAdmin();
  if (!admin) return Response.json({ error: { code: 'ADMIN_UNAUTHORIZED' } }, { status: 401 });
  if (!(await isPlatformFeatureEnabled('PARTNER_PAYOUT_ONBOARDING')))
    return Response.json({ error: { code: 'PAYOUT_ONBOARDING_DISABLED' } }, { status: 409 });
  const body = await readJsonObject(request);
  if (!body) return Response.json({ error: { code: 'PAYOUT_ACCOUNT_INVALID' } }, { status: 400 });
  try {
    const account = await partnerPayoutService.registerTokenizedAccount({
      accountHolderName: typeof body.accountHolderName === 'string' ? body.accountHolderName : '',
      accountLast4: typeof body.accountLast4 === 'string' ? body.accountLast4 : '',
      actorUserId: admin.id,
      bankName: typeof body.bankName === 'string' ? body.bankName : '',
      partnerId: typeof body.partnerId === 'string' ? body.partnerId : '',
      provider: typeof body.provider === 'string' ? body.provider : '',
      providerBeneficiaryRef:
        typeof body.providerBeneficiaryRef === 'string' ? body.providerBeneficiaryRef : '',
      reason: typeof body.reason === 'string' ? body.reason : '',
      routingCodeMasked:
        typeof body.routingCodeMasked === 'string' ? body.routingCodeMasked : undefined,
    });
    return Response.json(
      {
        data: { id: account.id, status: account.status, version: account.version },
      },
      { status: 201 },
    );
  } catch (error) {
    if (hasPrismaErrorCode(error, 'P2002'))
      return Response.json({ error: { code: 'PAYOUT_DESTINATION_EXISTS' } }, { status: 409 });
    return error instanceof PartnerPayoutError
      ? Response.json({ error: { code: error.code, message: error.message } }, { status: 409 })
      : Response.json({ error: { code: 'PAYOUT_ACCOUNT_FAILED' } }, { status: 500 });
  }
}
