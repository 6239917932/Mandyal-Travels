import { getPlatformAdmin } from '@/lib/adminAuth';
import { readJsonObject } from '@/lib/api/request';
import { PartnerPayoutError, partnerPayoutService } from '@/services/partnerPayoutService';

export async function POST(request: Request): Promise<Response> {
  if (!(await getPlatformAdmin()))
    return Response.json({ error: { code: 'ADMIN_UNAUTHORIZED' } }, { status: 401 });
  const body = await readJsonObject(request);
  const settlementIds = Array.isArray(body?.settlementIds)
    ? body.settlementIds.filter((value): value is string => typeof value === 'string')
    : [];
  try {
    return Response.json(
      {
        data: await partnerPayoutService.createBatch({
          currency: typeof body?.currency === 'string' ? body.currency : '',
          idempotencyKey: request.headers.get('Idempotency-Key') ?? '',
          settlementIds,
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    return error instanceof PartnerPayoutError
      ? Response.json({ error: { code: error.code, message: error.message } }, { status: 409 })
      : Response.json({ error: { code: 'PAYOUT_BATCH_FAILED' } }, { status: 500 });
  }
}
