import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import {
  PartnerStockInventoryError,
  recordPartnerStockLotAction,
} from '@/services/partnerStockInventoryService';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(request: Request) {
  if (!isSameOriginMutation(request))
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels partner portal.', 403);
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL')
    return failure('HOTEL_PARTNER_REQUIRED', 'A hotel partner account is required.', 403);
  if (access.memberRole !== 'ADMIN')
    return failure(
      'PARTNER_ADMIN_REQUIRED',
      'Only a supplier administrator can control stock batches.',
      403,
    );
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_STOCK_LOT_ACTION', 'Enter valid batch-control details.', 400);
  try {
    const event = await recordPartnerStockLotAction({
      actorUserId: access.userId,
      idempotencyKey: request.headers.get('x-idempotency-key') ?? '',
      partnerId: access.partnerId,
      values: body,
    });
    await recordPartnerAudit(access, {
      action: `STOCK_LOT_${event.eventType}`,
      entityId: event.id,
      entityType: 'HOTEL_STOCK_LOT_EVENT',
      summary: `${event.eventType.toLowerCase().replaceAll('_', ' ')} batch-control event recorded.`,
    });
    return Response.json({ data: { id: event.id, type: event.eventType } }, { status: 201 });
  } catch (error) {
    return error instanceof PartnerStockInventoryError
      ? failure(error.code, error.message, 409)
      : failure('STOCK_LOT_ACTION_FAILED', 'The batch-control action could not be recorded.', 500);
  }
}
