import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { HotelPosRuleError } from '@/lib/pms/pointOfSale';
import { createGuestRestaurantOrder } from '@/services/guestRestaurantOrderService';
import { PartnerHotelPosError } from '@/services/partnerHotelPosService';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels guest ordering page.', 403);
  }
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_ORDER', 'Enter valid restaurant order details.', 400);
  try {
    const order = await createGuestRestaurantOrder({
      confirmationCode: String(body.confirmationCode ?? ''),
      idempotencyKey: request.headers.get('x-idempotency-key') ?? '',
      items: body.items,
      note: body.note,
      outletId: body.outletId,
    });
    return Response.json({ data: { id: order.id, status: order.status } }, { status: 201 });
  } catch (error) {
    if (error instanceof HotelPosRuleError || error instanceof PartnerHotelPosError) {
      return failure(error.code, error.message, 409);
    }
    return failure('RESTAURANT_ORDER_FAILED', 'The restaurant order could not be placed.', 500);
  }
}
