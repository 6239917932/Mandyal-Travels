import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { HotelPosRuleError } from '@/lib/pms/pointOfSale';
import {
  createPartnerHotelPosOrder,
  PartnerHotelPosError,
} from '@/services/partnerHotelPosService';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels partner portal.', 403);
  }
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') {
    return failure('HOTEL_PARTNER_REQUIRED', 'Hotel partner access is required.', 403);
  }
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_POS_ORDER', 'Enter valid order details.', 400);
  try {
    const order = await createPartnerHotelPosOrder({
      actorUserId: access.userId,
      confirmationCode: String(body.confirmationCode ?? ''),
      idempotencyKey: request.headers.get('x-idempotency-key') ?? '',
      items: body.items,
      note: body.note,
      outletName: body.outletName,
      partnerId: access.partnerId,
      propertyId: String(body.propertyId ?? ''),
      serviceMode: body.serviceMode,
    });
    return Response.json({ data: { id: order.id, status: order.status } }, { status: 201 });
  } catch (error) {
    if (error instanceof HotelPosRuleError || error instanceof PartnerHotelPosError) {
      return failure(error.code, error.message, 409);
    }
    return failure('POS_ORDER_FAILED', 'The order could not be placed.', 500);
  }
}
