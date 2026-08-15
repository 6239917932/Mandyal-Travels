import { readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';
import {
  PartnerOperationsError,
  partnerOperationsService,
} from '@/services/partnerOperationsService';
import type { ApiErrorResponse } from '@/types/commerce';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

export async function GET(request: Request) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'CAR')
    return failure('CAR_PARTNER_REQUIRED', 'An active car supplier account is required.', 403);
  const data = await prisma.partnerVehicle.findMany({
    include: {
      inventoryDays: {
        orderBy: { serviceDate: 'asc' },
        take: 14,
        where: { serviceDate: { gte: new Date().toISOString().slice(0, 10) } },
      },
      maintenanceRecords: {
        orderBy: { startDate: 'desc' },
        take: 8,
      },
    },
    orderBy: { createdAt: 'desc' },
    where: { partnerId: access.partnerId },
  });
  return Response.json({ data });
}

export async function POST(request: Request) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'CAR')
    return failure('CAR_PARTNER_REQUIRED', 'An active car supplier account is required.', 403);
  if (access.memberRole !== 'ADMIN')
    return failure(
      'PARTNER_ADMIN_REQUIRED',
      'Only the supplier administrator can add vehicles to the fleet.',
      403,
    );
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_JSON', 'Enter valid vehicle details.', 400);
  try {
    const data = await partnerOperationsService.createVehicle(access.partnerId, {
      bags: Number(body.bags),
      cancellationPolicy: String(body.cancellationPolicy ?? ''),
      category: String(body.category ?? ''),
      dropoffLocation: String(body.dropoffLocation ?? ''),
      features: String(body.features ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      fuelPolicy: String(body.fuelPolicy ?? ''),
      mileagePolicy: String(body.mileagePolicy ?? ''),
      pickupLocation: String(body.pickupLocation ?? ''),
      pricePerDay: Number(body.pricePerDay),
      registrationNumber: String(body.registrationNumber ?? ''),
      seats: Number(body.seats),
      totalUnits: Number(body.totalUnits),
      transmission: String(body.transmission ?? ''),
      vehicleName: String(body.vehicleName ?? ''),
    });
    await recordPartnerAudit(access, {
      action: 'VEHICLE_CREATED',
      entityId: data.id,
      entityType: 'VEHICLE',
      summary: `${data.vehicleName} added to the fleet.`,
    });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return error instanceof PartnerOperationsError
      ? failure(error.code, error.message, 409)
      : failure('VEHICLE_CREATE_FAILED', 'The vehicle could not be added.', 500);
  }
}
