import { getPlatformAdmin } from '@/lib/adminAuth';
import { readJsonObject } from '@/lib/api/request';
import { PartnerPayoutError, partnerPayoutService } from '@/services/partnerPayoutService';

export async function POST(request: Request): Promise<Response> {
  if (!(await getPlatformAdmin()))
    return Response.json({ error: { code: 'ADMIN_UNAUTHORIZED' } }, { status: 401 });
  const body = await readJsonObject(request);
  if (!body) return Response.json({ error: { code: 'PAYOUT_ACCOUNT_INVALID' } }, { status: 400 });
  try {
    return Response.json(
      {
        data: await partnerPayoutService.registerTokenizedAccount({
          accountHolderName:
            typeof body.accountHolderName === 'string' ? body.accountHolderName : '',
          accountLast4: typeof body.accountLast4 === 'string' ? body.accountLast4 : '',
          bankName: typeof body.bankName === 'string' ? body.bankName : '',
          partnerId: typeof body.partnerId === 'string' ? body.partnerId : '',
          provider: typeof body.provider === 'string' ? body.provider : '',
          providerBeneficiaryRef:
            typeof body.providerBeneficiaryRef === 'string' ? body.providerBeneficiaryRef : '',
          routingCodeMasked:
            typeof body.routingCodeMasked === 'string' ? body.routingCodeMasked : undefined,
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    return error instanceof PartnerPayoutError
      ? Response.json({ error: { code: error.code, message: error.message } }, { status: 409 })
      : Response.json({ error: { code: 'PAYOUT_ACCOUNT_FAILED' } }, { status: 500 });
  }
}
