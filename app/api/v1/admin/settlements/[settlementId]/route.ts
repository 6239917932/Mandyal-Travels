import { getPlatformAdmin } from '@/lib/adminAuth';
import { readJsonObject } from '@/lib/api/request';
import {
  PartnerSettlementError,
  partnerSettlementService,
} from '@/services/partnerSettlementService';

type Context = { params: Promise<{ settlementId: string }> };
export async function PATCH(request: Request, context: Context): Promise<Response> {
  const admin = await getPlatformAdmin();
  if (!admin)
    return Response.json(
      { error: { code: 'ADMIN_UNAUTHORIZED', message: 'Administrator access is required.' } },
      { status: 401 },
    );
  const body = await readJsonObject(request);
  const action =
    body?.action === 'APPROVE' || body?.action === 'MARK_PAID' ? body.action : undefined;
  if (!action)
    return Response.json(
      { error: { code: 'INVALID_ACTION', message: 'Choose approve or mark paid.' } },
      { status: 400 },
    );
  const { settlementId } = await context.params;
  try {
    return Response.json({
      data: await partnerSettlementService.transition(
        settlementId,
        action,
        admin.id,
        typeof body?.note === 'string' ? body.note : '',
        typeof body?.paymentReference === 'string' ? body.paymentReference.trim() : undefined,
      ),
    });
  } catch (error) {
    return error instanceof PartnerSettlementError
      ? Response.json({ error: { code: error.code, message: error.message } }, { status: 409 })
      : Response.json(
          {
            error: {
              code: 'SETTLEMENT_UPDATE_FAILED',
              message: 'The settlement could not be updated.',
            },
          },
          { status: 500 },
        );
  }
}
