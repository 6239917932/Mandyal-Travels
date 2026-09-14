import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import {
  PartnerProcurementError,
  receivePartnerPurchaseOrderLine,
} from '@/services/partnerProcurementService';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(request: Request) {
  if (!isSameOriginMutation(request))
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels partner portal.', 403);
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL')
    return failure('HOTEL_PARTNER_REQUIRED', 'A hotel partner account is required.', 403);
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_GOODS_RECEIPT', 'Enter valid received-goods details.', 400);
  try {
    const receipt = await receivePartnerPurchaseOrderLine({
      actorUserId: access.userId,
      idempotencyKey: request.headers.get('x-idempotency-key') ?? '',
      partnerId: access.partnerId,
      values: body,
    });
    await recordPartnerAudit(access, {
      action: 'GOODS_RECEIPT_RECORDED',
      entityId: receipt.id,
      entityType: 'HOTEL_GOODS_RECEIPT',
      summary: `${receipt.quantity} units received against ${receipt.deliveryReference}.`,
    });
    return Response.json({ data: { id: receipt.id } }, { status: 201 });
  } catch (error) {
    return error instanceof PartnerProcurementError
      ? failure(error.code, error.message, 409)
      : failure('GOODS_RECEIPT_FAILED', 'The goods receipt could not be recorded.', 500);
  }
}
