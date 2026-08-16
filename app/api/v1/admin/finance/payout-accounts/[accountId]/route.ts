import { getPlatformAdmin } from '@/lib/adminAuth';
import { readJsonObject } from '@/lib/api/request';
import { PartnerPayoutError, partnerPayoutService } from '@/services/partnerPayoutService';

type Context = { params: Promise<{ accountId: string }> };

export async function PATCH(request: Request, context: Context): Promise<Response> {
  if (!(await getPlatformAdmin()))
    return Response.json({ error: { code: 'ADMIN_UNAUTHORIZED' } }, { status: 401 });
  const body = await readJsonObject(request);
  const action = body?.action;
  if (action !== 'VERIFY' && action !== 'REJECT')
    return Response.json({ error: { code: 'PAYOUT_REVIEW_INVALID' } }, { status: 400 });
  try {
    return Response.json({
      data: await partnerPayoutService.reviewAccount((await context.params).accountId, action),
    });
  } catch (error) {
    return error instanceof PartnerPayoutError
      ? Response.json({ error: { code: error.code, message: error.message } }, { status: 409 })
      : Response.json({ error: { code: 'PAYOUT_REVIEW_FAILED' } }, { status: 500 });
  }
}
