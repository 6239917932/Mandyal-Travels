import { getPlatformAdmin } from '@/lib/adminAuth';
import { readJsonObject, isSameOriginMutation } from '@/lib/api/request';
import { vehicleComplianceState } from '@/lib/car/complianceRules';
import { evaluateVehicleReview } from '@/lib/car/vehicleApproval';
import { prisma } from '@/lib/prisma';
import {
  PartnerOperationsError,
  partnerOperationsService,
} from '@/services/partnerOperationsService';
import type { ApiErrorResponse } from '@/types/commerce';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ partnerId: string; vehicleId: string }> },
) {
  if (!isSameOriginMutation(request))
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels portal.', 403);
  const admin = await getPlatformAdmin();
  if (!admin) return failure('ADMIN_REQUIRED', 'Platform administrator access is required.', 403);
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_JSON', 'Enter a valid review decision.', 400);
  const { partnerId, vehicleId } = await context.params;
  const vehicle = await prisma.partnerVehicle.findFirst({ where: { id: vehicleId, partnerId } });
  if (!vehicle) return failure('VEHICLE_NOT_FOUND', 'The supplier vehicle was not found.', 404);
  if (body.action === 'UPDATE_LISTING') {
    try {
      const data = await partnerOperationsService.adminUpdateVehicleListing(
        partnerId,
        vehicleId,
        admin.id,
        {
          bags: Number(body.bags),
          cancellationPolicy: String(body.cancellationPolicy ?? ''),
          category: String(body.category ?? ''),
          dropoffLocation: String(body.dropoffLocation ?? ''),
          expectedUpdatedAt: String(body.expectedUpdatedAt ?? ''),
          features: String(body.features ?? '').split(','),
          fuelPolicy: String(body.fuelPolicy ?? ''),
          mileagePolicy: String(body.mileagePolicy ?? ''),
          pickupLocation: String(body.pickupLocation ?? ''),
          pricePerDay: Number(body.pricePerDay),
          registrationNumber: String(body.registrationNumber ?? ''),
          seats: Number(body.seats),
          totalUnits: Number(body.totalUnits),
          transmission: String(body.transmission ?? ''),
          vehicleName: String(body.vehicleName ?? ''),
        },
      );
      return Response.json({ data });
    } catch (error) {
      return error instanceof PartnerOperationsError
        ? failure(error.code, error.message, 409)
        : failure('VEHICLE_UPDATE_FAILED', 'The listing changes could not be saved.', 500);
    }
  }
  const openHighRiskSignals = await prisma.riskSignal.count({
    where: {
      severity: 'HIGH',
      status: 'OPEN',
      subjectId: vehicle.id,
      subjectType: 'PARTNER_VEHICLE',
    },
  });
  const decision = evaluateVehicleReview({
    action: String(body.action ?? ''),
    approvalStatus: vehicle.approvalStatus,
    complianceState: vehicleComplianceState(vehicle, new Date().toISOString().slice(0, 10)),
    hasRegistrationNumber: Boolean(vehicle.registrationNumber),
    openHighRiskSignals,
    reviewNote: String(body.reviewNote ?? ''),
  });
  if (!decision.valid) return failure(decision.code, decision.message, 409);
  const data = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.partnerVehicle.update({
      data: {
        approvalNote: decision.reviewNote,
        approvalStatus: decision.approvalStatus,
        publicationStatus: decision.publicationStatus,
        reviewedAt: new Date(),
        reviewedByUserId: admin.id,
        status: decision.status,
      },
      where: { id: vehicle.id },
    });
    await transaction.partnerAuditLog.create({
      data: {
        action: `VEHICLE_${decision.action}`,
        actorUserId: admin.id,
        entityId: vehicle.id,
        entityType: 'VEHICLE',
        metadataJson: JSON.stringify({ reviewNoteLength: decision.reviewNote.length }),
        partnerId,
        summary: `${vehicle.vehicleName} was ${decision.action.toLowerCase()}d by a platform administrator.`,
      },
    });
    return updated;
  });
  return Response.json({ data });
}
