import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess } from '@/lib/partnerAuth';
import {
  HotelRoomOperationRuleError,
  PartnerRoomOperationsError,
  recordHousekeepingInspection,
} from '@/services/partnerHousekeepingMaintenanceService';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(
  request: Request,
  context: { params: Promise<{ physicalRoomId: string }> },
) {
  if (!isSameOriginMutation(request)) {
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels partner portal.', 403);
  }
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') {
    return failure('HOTEL_PARTNER_REQUIRED', 'A hotel partner account is required.', 403);
  }
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_INSPECTION', 'Enter valid inspection details.', 400);
  const { physicalRoomId } = await context.params;
  try {
    const inspection = await recordHousekeepingInspection({
      actorUserId: access.userId,
      idempotencyKey: request.headers.get('x-idempotency-key') ?? '',
      note: body.note,
      partnerId: access.partnerId,
      physicalRoomId,
      result: body.result,
    });
    return Response.json(
      { data: { id: inspection.id, result: inspection.result } },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof HotelRoomOperationRuleError ||
      error instanceof PartnerRoomOperationsError
    ) {
      return failure(error.code, error.message, 409);
    }
    return failure('INSPECTION_FAILED', 'The room inspection could not be recorded.', 500);
  }
}
