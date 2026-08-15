import { readJsonObject } from '@/lib/api/request';
import {
  nextCarReservationState,
  type CarReservationAction,
} from '@/lib/car/reservationOperations';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';
import type { ApiErrorResponse } from '@/types/commerce';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ confirmationCode: string }> },
) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'CAR')
    return failure('CAR_PARTNER_REQUIRED', 'Car partner access is required.', 403);
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_JSON', 'Enter a valid rental action.', 400);
  const action = ['COMPLETE', 'MARK_NO_SHOW', 'PICK_UP'].includes(String(body.action))
    ? (String(body.action) as CarReservationAction)
    : undefined;
  if (!action) return failure('INVALID_RENTAL_ACTION', 'Choose a supported rental action.', 400);
  const { confirmationCode } = await context.params;
  const reservation = await prisma.partnerVehicleReservation.findFirst({
    include: { vehicle: { select: { vehicleName: true } } },
    where: { confirmationCode, partnerId: access.partnerId },
  });
  if (!reservation)
    return failure('RESERVATION_NOT_FOUND', 'The scoped rental was not found.', 404);
  try {
    const status = nextCarReservationState({
      action,
      dropoffDate: reservation.dropoffDate,
      pickupDate: reservation.pickupDate,
      status: reservation.status,
      today: new Date().toISOString().slice(0, 10),
    });
    const updated = await prisma.partnerVehicleReservation.updateMany({
      data: { status },
      where: { id: reservation.id, status: reservation.status },
    });
    if (updated.count !== 1) {
      return failure(
        'RENTAL_STATE_CHANGED',
        'This rental changed while you were reviewing it. Refresh and try again.',
        409,
      );
    }
    const data = await prisma.partnerVehicleReservation.findUniqueOrThrow({
      where: { id: reservation.id },
    });
    await recordPartnerAudit(access, {
      action: `VEHICLE_RESERVATION_${status}`,
      entityId: reservation.id,
      entityType: 'VEHICLE_RESERVATION',
      summary: `${reservation.vehicle.vehicleName} rental ${confirmationCode} marked ${status.toLowerCase().replace('_', ' ')}.`,
    });
    return Response.json({ data });
  } catch (error) {
    return failure(
      'INVALID_RENTAL_TRANSITION',
      error instanceof Error ? error.message : 'The rental status could not be updated.',
      409,
    );
  }
}
