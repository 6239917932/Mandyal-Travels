import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import {
  PartnerOperationsError,
  partnerOperationsService,
} from '@/services/partnerOperationsService';
import type { ApiErrorResponse } from '@/types/commerce';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

const housekeepingStatuses = ['CLEANING', 'DIRTY', 'READY'] as const;
const operationalStatuses = ['ACTIVE', 'OUT_OF_SERVICE'] as const;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ physicalRoomId: string; propertyId: string; roomId: string }> },
) {
  if (!isSameOriginMutation(request)) {
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels partner portal.', 403);
  }
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL') {
    return failure('HOTEL_PARTNER_REQUIRED', 'An active hotel supplier account is required.', 403);
  }
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_JSON', 'Enter a valid room status.', 400);
  const housekeepingStatus = String(body.housekeepingStatus ?? '');
  const operationalStatus = String(body.operationalStatus ?? '');
  if (!housekeepingStatuses.some((status) => status === housekeepingStatus)) {
    return failure('INVALID_HOUSEKEEPING_STATUS', 'Choose ready, dirty, or cleaning.', 400);
  }
  if (!operationalStatuses.some((status) => status === operationalStatus)) {
    return failure('INVALID_OPERATIONAL_STATUS', 'Choose active or out of service.', 400);
  }
  try {
    const { physicalRoomId, propertyId, roomId } = await context.params;
    const data = await partnerOperationsService.updatePhysicalRoom(
      access.partnerId,
      propertyId,
      roomId,
      physicalRoomId,
      {
        housekeepingStatus: housekeepingStatus as (typeof housekeepingStatuses)[number],
        operationalStatus: operationalStatus as (typeof operationalStatuses)[number],
      },
    );
    await recordPartnerAudit(access, {
      action: 'PHYSICAL_ROOM_STATUS_UPDATED',
      entityId: data.id,
      entityType: 'PHYSICAL_ROOM',
      metadata: { housekeepingStatus, operationalStatus, propertyId, roomId },
      summary: `Room ${data.roomNumber} is ${housekeepingStatus.toLowerCase()} and ${operationalStatus.toLowerCase().replaceAll('_', ' ')}.`,
    });
    return Response.json({ data });
  } catch (error) {
    return error instanceof PartnerOperationsError
      ? failure(error.code, error.message, 409)
      : failure(
          'PHYSICAL_ROOM_UPDATE_FAILED',
          'The physical room status could not be updated.',
          500,
        );
  }
}
