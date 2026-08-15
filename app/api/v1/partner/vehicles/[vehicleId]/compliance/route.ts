import { readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { PartnerOperationsError, partnerOperationsService } from '@/services/partnerOperationsService';
import type { ApiErrorResponse } from '@/types/commerce';

type Context = { params: Promise<{ vehicleId: string }> };
const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

export async function PATCH(request: Request, { params }: Context) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'CAR')
    return failure('CAR_PARTNER_REQUIRED', 'An active car supplier account is required.', 403);
  if (access.memberRole !== 'ADMIN')
    return failure('PARTNER_ADMIN_REQUIRED', 'Only a supplier administrator can update compliance records.', 403);
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_JSON', 'Enter valid compliance dates.', 400);
  const { vehicleId } = await params;
  try {
    const data = await partnerOperationsService.updateVehicleCompliance({
      fitnessExpiry: String(body.fitnessExpiry ?? ''),
      insuranceExpiry: String(body.insuranceExpiry ?? ''),
      partnerId: access.partnerId,
      permitExpiry: String(body.permitExpiry ?? ''),
      pollutionExpiry: String(body.pollutionExpiry ?? ''),
      registrationExpiry: String(body.registrationExpiry ?? ''),
      vehicleId,
    });
    await recordPartnerAudit(access, {
      action: 'VEHICLE_COMPLIANCE_UPDATED',
      entityId: data.id,
      entityType: 'VEHICLE',
      metadata: { fitnessExpiry: data.fitnessExpiry, insuranceExpiry: data.insuranceExpiry, permitExpiry: data.permitExpiry, pollutionExpiry: data.pollutionExpiry, registrationExpiry: data.registrationExpiry },
      summary: `${data.vehicleName} compliance dates updated.`,
    });
    return Response.json({ data });
  } catch (error) {
    return error instanceof PartnerOperationsError
      ? failure(error.code, error.message, 409)
      : failure('INVALID_VEHICLE_COMPLIANCE', error instanceof Error ? error.message : 'Compliance dates could not be saved.', 400);
  }
}
