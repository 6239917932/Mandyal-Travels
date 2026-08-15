import { readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { PartnerOperationsError, partnerOperationsService } from '@/services/partnerOperationsService';
import type { ApiErrorResponse } from '@/types/commerce';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

export async function PATCH(request: Request, context: { params: Promise<{ propertyId: string; roomId: string }> }) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL') return failure('HOTEL_PARTNER_REQUIRED', 'An active hotel supplier account is required.', 403);
  if (access.memberRole !== 'ADMIN') return failure('PARTNER_ADMIN_REQUIRED', 'Only the supplier administrator can edit room types.', 403);
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_JSON', 'Enter valid room details.', 400);
  try {
    const { propertyId, roomId } = await context.params;
    const action = String(body.action ?? 'UPDATE');
    const data = action === 'PAUSE' || action === 'RESTORE'
      ? await partnerOperationsService.setRoomTypeStatus(access.partnerId, propertyId, roomId, action)
      : action === 'UPDATE'
        ? await partnerOperationsService.updateRoomType(access.partnerId, propertyId, roomId, {
            amenities: String(body.amenities ?? '').split(',').map((value) => value.trim()),
            bedDescription: String(body.bedDescription ?? ''),
            description: String(body.description ?? ''),
            inventoryCount: Number(body.inventoryCount),
            imageUrl: String(body.imageUrl ?? ''),
            maximumAdults: Number(body.maximumAdults),
            maximumChildren: Number(body.maximumChildren),
            maximumGuests: Number(body.maximumGuests),
            name: String(body.name ?? ''),
          })
        : null;
    if (!data) return failure('INVALID_ROOM_ACTION', 'Choose update, pause, or restore.', 400);
    const auditAction = action === 'PAUSE' ? 'ROOM_TYPE_PAUSED' : action === 'RESTORE' ? 'ROOM_TYPE_RESTORED' : 'ROOM_TYPE_UPDATED';
    await recordPartnerAudit(access, { action: auditAction, entityId: data.id, entityType: 'ROOM_TYPE', metadata: { propertyId }, summary: `${data.name} was ${action.toLowerCase()}d.` });
    return Response.json({ data });
  } catch (error) {
    return error instanceof PartnerOperationsError ? failure(error.code, error.message, 409) : failure('ROOM_UPDATE_FAILED', 'The room type could not be updated.', 500);
  }
}
