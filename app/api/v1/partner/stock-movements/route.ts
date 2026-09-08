import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import {
  PartnerStockInventoryError,
  recordPartnerStockMovement,
} from '@/services/partnerStockInventoryService';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(request: Request) {
  if (!isSameOriginMutation(request))
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels partner portal.', 403);
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL')
    return failure('HOTEL_PARTNER_REQUIRED', 'A hotel partner account is required.', 403);
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_STOCK_MOVEMENT', 'Enter valid stock movement details.', 400);
  try {
    const movement = await recordPartnerStockMovement({
      actorUserId: access.userId,
      idempotencyKey: request.headers.get('x-idempotency-key') ?? '',
      partnerId: access.partnerId,
      values: body,
    });
    await recordPartnerAudit(access, {
      action: 'STOCK_MOVEMENT_RECORDED',
      entityId: movement.id,
      entityType: 'HOTEL_STOCK_MOVEMENT',
      summary: `${movement.movementType} stock movement recorded.`,
    });
    return Response.json(
      { data: { id: movement.id, resultingQuantity: movement.resultingQuantity } },
      { status: 201 },
    );
  } catch (error) {
    return error instanceof PartnerStockInventoryError
      ? failure(error.code, error.message, 409)
      : failure('STOCK_MOVEMENT_FAILED', 'The stock movement could not be recorded.', 500);
  }
}
