import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import {
  createPartnerPurchaseOrder,
  PartnerProcurementError,
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
  if (!body) return failure('INVALID_PURCHASE_ORDER', 'Enter valid purchase-order details.', 400);
  try {
    const order = await createPartnerPurchaseOrder({
      actorUserId: access.userId,
      partnerId: access.partnerId,
      values: body,
    });
    await recordPartnerAudit(access, {
      action: 'PURCHASE_ORDER_CREATED',
      entityId: order.id,
      entityType: 'HOTEL_PURCHASE_ORDER',
      summary: `${order.purchaseOrderNumber} created as draft.`,
    });
    return Response.json(
      { data: { id: order.id, status: order.status, version: order.version } },
      { status: 201 },
    );
  } catch (error) {
    return error instanceof PartnerProcurementError
      ? failure(error.code, error.message, 409)
      : failure('PURCHASE_ORDER_CREATE_FAILED', 'The purchase order could not be created.', 500);
  }
}
