import { readJsonObject } from '@/lib/api/request';
import { normalizeBusTrip } from '@/lib/bus/operatorRules';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';
import type { ApiErrorResponse } from '@/types/commerce';
type Context = { params: Promise<{ routeId: string }> };
const failure = (code: string, message: string, status: number) => Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });
export async function POST(request: Request, { params }: Context) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'BUS') return failure('BUS_PARTNER_REQUIRED', 'An active bus operator account is required.', 403);
  const { routeId } = await params;
  const route = await prisma.partnerBusRoute.findFirst({ where: { id: routeId, partnerId: access.partnerId, status: 'ACTIVE' } });
  if (!route) return failure('BUS_ROUTE_NOT_FOUND', 'The active route was not found.', 404);
  const body = await readJsonObject(request); if (!body) return failure('INVALID_JSON', 'Enter valid trip details.', 400);
  try {
    const input = normalizeBusTrip({ amenities: String(body.amenities ?? '').split(',').map((value) => value.trim()).filter(Boolean), arrivalTime: String(body.arrivalTime ?? ''), busType: String(body.busType ?? ''), cancellationPolicy: String(body.cancellationPolicy ?? ''), departureTime: String(body.departureTime ?? ''), pricePerSeat: Number(body.pricePerSeat), refundable: body.refundable === true, seatCapacity: Number(body.seatCapacity), serviceDate: String(body.serviceDate ?? '') }, new Date().toISOString().slice(0, 10));
    const data = await prisma.partnerBusTrip.create({ data: { amenitiesJson: JSON.stringify(input.amenities), arrivalTime: input.arrivalTime, busType: input.busType, cancellationPolicy: input.cancellationPolicy, departureTime: input.departureTime, pricePerSeat: input.pricePerSeat, refundable: input.refundable, routeId, seatCapacity: input.seatCapacity, serviceDate: input.serviceDate } });
    await recordPartnerAudit(access, { action: 'BUS_TRIP_CREATED', entityId: data.id, entityType: 'BUS_TRIP', metadata: { routeId, serviceDate: data.serviceDate }, summary: `${route.origin} to ${route.destination} trip scheduled.` });
    return Response.json({ data }, { status: 201 });
  } catch (error) { return failure('INVALID_BUS_TRIP', error instanceof Error ? error.message : 'The trip could not be created.', 400); }
}
