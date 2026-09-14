import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import {
  PartnerProcurementError,
  transitionPartnerPurchaseOrder,
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
  if (!body)
    return failure('INVALID_PURCHASE_ORDER_ACTION', 'Enter a valid purchase-order action.', 400);
  try {
    const event = await transitionPartnerPurchaseOrder({
      actorIsAdmin: access.memberRole === 'ADMIN',
      actorUserId: access.userId,
      idempotencyKey: request.headers.get('x-idempotency-key') ?? '',
      partnerId: access.partnerId,
      values: body,
    });
    await recordPartnerAudit(access, {
      action: `PURCHASE_ORDER_${event.action}`,
      entityId: event.purchaseOrderId,
      entityType: 'HOTEL_PURCHASE_ORDER',
      summary: `Purchase order ${event.toStatus.toLowerCase()}.`,
    });
    return Response.json(
      { data: { status: event.toStatus, version: event.version } },
      { status: 201 },
    );
  } catch (error) {
    return error instanceof PartnerProcurementError
      ? failure(error.code, error.message, error.code === 'APPROVAL_REQUIRED' ? 403 : 409)
      : failure(
          'PURCHASE_ORDER_ACTION_FAILED',
          'The purchase-order action could not be recorded.',
          500,
        );
  }
}
