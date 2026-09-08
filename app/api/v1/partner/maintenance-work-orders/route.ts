import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess } from '@/lib/partnerAuth';
import {
  createMaintenanceWorkOrder,
  HotelRoomOperationRuleError,
  PartnerRoomOperationsError,
} from '@/services/partnerHousekeepingMaintenanceService';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels partner portal.', 403);
  }
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') {
    return failure('HOTEL_PARTNER_REQUIRED', 'A hotel partner account is required.', 403);
  }
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_WORK_ORDER', 'Enter valid maintenance details.', 400);
  try {
    const workOrder = await createMaintenanceWorkOrder({
      actorUserId: access.userId,
      category: body.category,
      description: body.description,
      idempotencyKey: request.headers.get('x-idempotency-key') ?? '',
      partnerId: access.partnerId,
      physicalRoomId: String(body.physicalRoomId ?? ''),
      priority: body.priority,
      summary: body.summary,
    });
    return Response.json(
      { data: { id: workOrder.id, status: workOrder.status, version: workOrder.version } },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof HotelRoomOperationRuleError ||
      error instanceof PartnerRoomOperationsError
    ) {
      return failure(error.code, error.message, 409);
    }
    return failure('WORK_ORDER_FAILED', 'The maintenance work order could not be opened.', 500);
  }
}
