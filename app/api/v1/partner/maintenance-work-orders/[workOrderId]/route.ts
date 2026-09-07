import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess } from '@/lib/partnerAuth';
import {
  HotelRoomOperationRuleError,
  PartnerRoomOperationsError,
  transitionMaintenanceWorkOrder,
} from '@/services/partnerHousekeepingMaintenanceService';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ workOrderId: string }> },
) {
  if (!isSameOriginMutation(request)) {
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels partner portal.', 403);
  }
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') {
    return failure('HOTEL_PARTNER_REQUIRED', 'A hotel partner account is required.', 403);
  }
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_WORK_ORDER', 'Enter a valid status update.', 400);
  const { workOrderId } = await context.params;
  try {
    const workOrder = await transitionMaintenanceWorkOrder({
      actorUserId: access.userId,
      nextStatus: body.status,
      note: body.note,
      partnerId: access.partnerId,
      version: Number(body.version),
      workOrderId,
    });
    return Response.json({
      data: { id: workOrder.id, status: workOrder.status, version: workOrder.version },
    });
  } catch (error) {
    if (
      error instanceof HotelRoomOperationRuleError ||
      error instanceof PartnerRoomOperationsError
    ) {
      return failure(error.code, error.message, 409);
    }
    return failure('WORK_ORDER_UPDATE_FAILED', 'The maintenance status could not be updated.', 500);
  }
}
