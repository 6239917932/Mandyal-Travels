import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { HotelPosRuleError } from '@/lib/pms/pointOfSale';
import {
  PartnerHotelPosError,
  transitionPartnerHotelPosOrder,
} from '@/services/partnerHotelPosService';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  if (!isSameOriginMutation(request)) {
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels partner portal.', 403);
  }
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') {
    return failure('HOTEL_PARTNER_REQUIRED', 'Hotel partner access is required.', 403);
  }
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_POS_ACTION', 'Enter a valid order action.', 400);
  const { orderId } = await context.params;
  try {
    const order = await transitionPartnerHotelPosOrder({
      actorUserId: access.userId,
      idempotencyKey: request.headers.get('x-idempotency-key') ?? '',
      note: body.note,
      orderId,
      partnerId: access.partnerId,
      targetStatus: body.targetStatus,
      version: Number(body.version),
    });
    return Response.json({ data: { id: order.id, status: order.status } });
  } catch (error) {
    if (error instanceof HotelPosRuleError || error instanceof PartnerHotelPosError) {
      return failure(error.code, error.message, 409);
    }
    return failure('POS_ACTION_FAILED', 'The order could not be updated.', 500);
  }
}
