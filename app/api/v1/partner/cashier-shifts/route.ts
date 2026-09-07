import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { HotelFolioRuleError } from '@/lib/pms/folio';
import {
  closeHotelCashierShift,
  openHotelCashierShift,
  PartnerHotelFolioError,
} from '@/services/partnerHotelFolioService';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels partner portal.', 403);
  }
  const access = await getPartnerAccess(request);
  if (
    !access?.partnerId ||
    !access.userId ||
    access.partnerType !== 'HOTEL' ||
    access.memberRole !== 'ADMIN'
  ) {
    return failure(
      'PARTNER_ADMIN_REQUIRED',
      'A hotel partner administrator is required for cashier shifts.',
      403,
    );
  }
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_CASHIER_ACTION', 'Enter valid cashier details.', 400);
  const idempotencyKey = request.headers.get('x-idempotency-key') ?? '';
  try {
    if (body.action === 'OPEN') {
      const shift = await openHotelCashierShift({
        actorUserId: access.userId,
        idempotencyKey,
        openingFloatAmount: body.openingFloatAmount,
        partnerId: access.partnerId,
        propertyId: String(body.propertyId ?? ''),
      });
      return Response.json(
        {
          data: {
            businessDate: shift.businessDate,
            id: shift.id,
            openingFloatAmount: shift.openingFloatAmount,
            status: shift.status,
            version: shift.version,
          },
        },
        { status: 201 },
      );
    }
    if (body.action === 'CLOSE') {
      const shift = await closeHotelCashierShift({
        actorUserId: access.userId,
        declaredClosingAmount: body.declaredClosingAmount,
        idempotencyKey,
        partnerId: access.partnerId,
        shiftId: String(body.shiftId ?? ''),
        version: Number(body.version),
      });
      return Response.json({
        data: { id: shift.id, status: shift.status, version: shift.version },
      });
    }
    return failure('INVALID_CASHIER_ACTION', 'Choose open or close shift.', 400);
  } catch (error) {
    if (error instanceof HotelFolioRuleError || error instanceof PartnerHotelFolioError) {
      return failure(error.code, error.message, 409);
    }
    return failure('CASHIER_ACTION_FAILED', 'The cashier action could not be completed.', 500);
  }
}
