import { readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import {
  PartnerOperationsError,
  partnerOperationsService,
} from '@/services/partnerOperationsService';
import type { ApiErrorResponse } from '@/types/commerce';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

export async function POST(
  request: Request,
  context: { params: Promise<{ propertyId: string; roomId: string }> },
) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL') {
    return failure('HOTEL_PARTNER_REQUIRED', 'An active hotel supplier account is required.', 403);
  }
  if (access.memberRole !== 'ADMIN') {
    return failure(
      'PARTNER_ADMIN_REQUIRED',
      'Only the supplier administrator can register rooms.',
      403,
    );
  }
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_JSON', 'Enter valid physical room details.', 400);
  try {
    const { propertyId, roomId } = await context.params;
    const data = await partnerOperationsService.createPhysicalRoom(
      access.partnerId,
      propertyId,
      roomId,
      {
        floorLabel: String(body.floorLabel ?? ''),
        notes: String(body.notes ?? ''),
        roomNumber: String(body.roomNumber ?? ''),
      },
    );
    await recordPartnerAudit(access, {
      action: 'PHYSICAL_ROOM_CREATED',
      entityId: data.id,
      entityType: 'PHYSICAL_ROOM',
      metadata: { propertyId, roomId, roomNumber: data.roomNumber },
      summary: `Physical room ${data.roomNumber} was registered.`,
    });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return error instanceof PartnerOperationsError
      ? failure(error.code, error.message, 409)
      : failure('PHYSICAL_ROOM_CREATE_FAILED', 'The physical room could not be registered.', 500);
  }
}
