import { readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import {
  PartnerOperationsError,
  partnerOperationsService,
} from '@/services/partnerOperationsService';
import type { ApiErrorResponse } from '@/types/commerce';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

export async function PATCH(request: Request, context: { params: Promise<{ vehicleId: string }> }) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'CAR')
    return failure('CAR_PARTNER_REQUIRED', 'An active car supplier account is required.', 403);
  if (access.memberRole !== 'ADMIN')
    return failure(
      'PARTNER_ADMIN_REQUIRED',
      'Only the supplier administrator can change vehicle sales status.',
      403,
    );
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_JSON', 'Enter a valid vehicle status.', 400);
  const status = body.status === 'ACTIVE' || body.status === 'PAUSED' ? body.status : undefined;
  if (!status) return failure('INVALID_VEHICLE_STATUS', 'Choose ACTIVE or PAUSED.', 400);
  const { vehicleId } = await context.params;
  try {
    const data = await partnerOperationsService.updateVehicleStatus({
      partnerId: access.partnerId,
      status,
      today: new Date().toISOString().slice(0, 10),
      vehicleId,
    });
    await recordPartnerAudit(access, {
      action: status === 'ACTIVE' ? 'VEHICLE_RESTORED' : 'VEHICLE_PAUSED',
      entityId: data.id,
      entityType: 'VEHICLE',
      summary:
        status === 'ACTIVE'
          ? `${data.vehicleName} restored to customer search.`
          : `${data.vehicleName} paused from customer search. Existing reservations were preserved.`,
    });
    return Response.json({ data });
  } catch (error) {
    return error instanceof PartnerOperationsError
      ? failure(error.code, error.message, 409)
      : failure('VEHICLE_STATUS_UPDATE_FAILED', 'Vehicle status could not be updated.', 500);
  }
}
