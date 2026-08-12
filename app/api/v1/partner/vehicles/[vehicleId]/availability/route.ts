import { readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import {
  PartnerOperationsError,
  partnerOperationsService,
} from '@/services/partnerOperationsService';
import type { ApiErrorResponse } from '@/types/commerce';

type Context = { params: Promise<{ vehicleId: string }> };
const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

export async function POST(request: Request, { params }: Context) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'CAR')
    return failure('CAR_PARTNER_REQUIRED', 'An active car supplier account is required.', 403);
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_JSON', 'Enter valid availability details.', 400);
  const { vehicleId } = await params;
  try {
    const data = await partnerOperationsService.setVehicleCalendar({
      partnerId: access.partnerId,
      vehicleId,
      availableUnits: Number(body.availableUnits),
      endDate: String(body.endDate ?? ''),
      note: String(body.note ?? ''),
      pricePerDay:
        body.pricePerDay === '' || body.pricePerDay == null ? undefined : Number(body.pricePerDay),
      startDate: String(body.startDate ?? ''),
      stopSell: body.stopSell === true,
    });
    await recordPartnerAudit(access, {
      action: 'VEHICLE_CALENDAR_UPDATED',
      entityId: vehicleId,
      entityType: 'VEHICLE',
      metadata: { endDate: body.endDate, startDate: body.startDate, stopSell: body.stopSell },
      summary: 'Fleet availability and rate calendar updated.',
    });
    return Response.json({ data });
  } catch (error) {
    return error instanceof PartnerOperationsError
      ? failure(error.code, error.message, 409)
      : failure('CALENDAR_UPDATE_FAILED', 'The vehicle calendar could not be updated.', 500);
  }
}
