import { readJsonObject } from '@/lib/api/request';
import { normalizeVehicleMaintenance } from '@/lib/car/maintenanceRules';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';
import type { ApiErrorResponse } from '@/types/commerce';

type Context = { params: Promise<{ vehicleId: string }> };
const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

export async function POST(request: Request, { params }: Context) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'CAR') return failure('CAR_PARTNER_REQUIRED', 'An active car supplier account is required.', 403);
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_JSON', 'Enter valid maintenance details.', 400);
  const { vehicleId } = await params;
  const vehicle = await prisma.partnerVehicle.findFirst({ where: { id: vehicleId, partnerId: access.partnerId } });
  if (!vehicle) return failure('VEHICLE_NOT_FOUND', 'The vehicle was not found.', 404);
  try {
    const input = normalizeVehicleMaintenance({
      category: String(body.category ?? ''),
      costAmount: body.costAmount === '' || body.costAmount == null ? undefined : Number(body.costAmount),
      description: String(body.description ?? ''),
      endDate: String(body.endDate ?? ''),
      startDate: String(body.startDate ?? ''),
      status: String(body.status ?? ''),
      vendor: String(body.vendor ?? ''),
    });
    const data = await prisma.$transaction(async (transaction) => {
      const record = await transaction.partnerVehicleMaintenance.create({ data: { ...input, vehicleId } });
      if (input.status !== 'COMPLETED') {
        const end = new Date(`${input.endDate}T00:00:00Z`);
        for (let current = new Date(`${input.startDate}T00:00:00Z`); current <= end; current.setUTCDate(current.getUTCDate() + 1)) {
          const serviceDate = current.toISOString().slice(0, 10);
          await transaction.partnerVehicleInventoryDay.upsert({
            create: { availableUnits: 0, note: `Maintenance: ${input.category}`, serviceDate, stopSell: true, vehicleId },
            update: { availableUnits: 0, note: `Maintenance: ${input.category}`, stopSell: true },
            where: { vehicleId_serviceDate: { serviceDate, vehicleId } },
          });
        }
      }
      return record;
    });
    await recordPartnerAudit(access, { action: 'VEHICLE_MAINTENANCE_RECORDED', entityId: data.id, entityType: 'VEHICLE_MAINTENANCE', metadata: { category: data.category, endDate: data.endDate, startDate: data.startDate, status: data.status, vehicleId }, summary: `${vehicle.vehicleName} maintenance recorded.` });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return failure('INVALID_MAINTENANCE', error instanceof Error ? error.message : 'Maintenance could not be recorded.', 400);
  }
}
