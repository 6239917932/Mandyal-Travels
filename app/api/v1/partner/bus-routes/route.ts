import { randomUUID } from 'node:crypto';
import { readJsonObject } from '@/lib/api/request';
import { normalizeBusRoute } from '@/lib/bus/operatorRules';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';
import type { ApiErrorResponse } from '@/types/commerce';
const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });
export async function GET(request: Request) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'BUS')
    return failure('BUS_PARTNER_REQUIRED', 'An active bus operator account is required.', 403);
  const data = await prisma.partnerBusRoute.findMany({
    include: { trips: { orderBy: [{ serviceDate: 'asc' }, { departureTime: 'asc' }], take: 30 } },
    orderBy: { createdAt: 'desc' },
    where: { partnerId: access.partnerId },
  });
  return Response.json({ data });
}
export async function POST(request: Request) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'BUS')
    return failure('BUS_PARTNER_REQUIRED', 'An active bus operator account is required.', 403);
  if (access.memberRole !== 'ADMIN')
    return failure(
      'PARTNER_ADMIN_REQUIRED',
      'Only an operator administrator can create routes.',
      403,
    );
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_JSON', 'Enter valid route details.', 400);
  try {
    const input = normalizeBusRoute({
      boardingPoint: String(body.boardingPoint ?? ''),
      destination: String(body.destination ?? ''),
      droppingPoint: String(body.droppingPoint ?? ''),
      origin: String(body.origin ?? ''),
    });
    const data = await prisma.partnerBusRoute.create({
      data: { ...input, code: `direct-bus-${randomUUID()}`, partnerId: access.partnerId },
    });
    await recordPartnerAudit(access, {
      action: 'BUS_ROUTE_CREATED',
      entityId: data.id,
      entityType: 'BUS_ROUTE',
      metadata: { destination: data.destination, origin: data.origin },
      summary: `${data.origin} to ${data.destination} route created.`,
    });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return failure(
      'INVALID_BUS_ROUTE',
      error instanceof Error ? error.message : 'The route could not be created.',
      400,
    );
  }
}
