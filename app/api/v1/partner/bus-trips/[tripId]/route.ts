import { readJsonObject } from '@/lib/api/request';
import { normalizeBusTripControls } from '@/lib/bus/operatorRules';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';
import type { ApiErrorResponse } from '@/types/commerce';

type Context = { params: Promise<{ tripId: string }> };
const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

function occupiedSeatFloor(values: string[]): number {
  return values.reduce((maximum, seat) => {
    const match = /^(\d{1,2})([A-D])$/.exec(seat);
    if (!match) return maximum;
    return Math.max(maximum, (Number(match[1]) - 1) * 4 + match[2].charCodeAt(0) - 64);
  }, 0);
}

function readSeats(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((seat): seat is string => typeof seat === 'string')
      : [];
  } catch {
    return [];
  }
}

export async function PATCH(request: Request, { params }: Context) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'BUS')
    return failure('BUS_PARTNER_REQUIRED', 'An active bus operator account is required.', 403);
  if (access.memberRole !== 'ADMIN')
    return failure('PARTNER_ADMIN_REQUIRED', 'Only an operator administrator can edit trips.', 403);
  const { tripId } = await params;
  const trip = await prisma.partnerBusTrip.findFirst({
    include: {
      reservations: {
        select: { passengerCount: true, seatNumbersJson: true },
        where: { status: 'CONFIRMED' },
      },
      route: { select: { destination: true, origin: true, partnerId: true } },
    },
    where: { id: tripId, route: { partnerId: access.partnerId } },
  });
  if (!trip) return failure('BUS_TRIP_NOT_FOUND', 'The operator trip was not found.', 404);
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_JSON', 'Enter valid trip controls.', 400);
  let controls;
  try {
    controls = normalizeBusTripControls({
      pricePerSeat: body.pricePerSeat === undefined ? trip.pricePerSeat : Number(body.pricePerSeat),
      seatCapacity: body.seatCapacity === undefined ? trip.seatCapacity : Number(body.seatCapacity),
      status: String(body.status ?? trip.status),
    });
  } catch (error) {
    return failure(
      'INVALID_BUS_TRIP_CONTROLS',
      error instanceof Error ? error.message : 'Enter valid trip controls.',
      400,
    );
  }
  const { pricePerSeat, seatCapacity, status } = controls;
  const occupiedSeats = trip.reservations.flatMap((reservation) =>
    readSeats(reservation.seatNumbersJson),
  );
  const reservedPassengers = trip.reservations.reduce(
    (total, reservation) => total + reservation.passengerCount,
    0,
  );
  if (seatCapacity < reservedPassengers || seatCapacity < occupiedSeatFloor(occupiedSeats))
    return failure(
      'BUS_CAPACITY_BELOW_RESERVATIONS',
      'Capacity cannot be reduced below confirmed passengers or their assigned seats.',
      409,
    );
  const data = await prisma.partnerBusTrip.update({
    data: { pricePerSeat, seatCapacity, status },
    where: { id: trip.id },
  });
  await recordPartnerAudit(access, {
    action: 'BUS_TRIP_UPDATED',
    entityId: trip.id,
    entityType: 'BUS_TRIP',
    metadata: { pricePerSeat, seatCapacity, status },
    summary: `${trip.route.origin} to ${trip.route.destination} trip controls updated.`,
  });
  return Response.json({ data });
}
