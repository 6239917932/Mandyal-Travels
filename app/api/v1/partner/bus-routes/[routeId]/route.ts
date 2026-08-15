import { readJsonObject } from '@/lib/api/request';
import { normalizeBusRouteStatus } from '@/lib/bus/operatorRules';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';
import type { ApiErrorResponse } from '@/types/commerce';

type Context = { params: Promise<{ routeId: string }> };
const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

export async function PATCH(request: Request, { params }: Context) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'BUS')
    return failure('BUS_PARTNER_REQUIRED', 'An active bus operator account is required.', 403);
  if (access.memberRole !== 'ADMIN')
    return failure(
      'PARTNER_ADMIN_REQUIRED',
      'Only an operator administrator can control routes.',
      403,
    );
  const { routeId } = await params;
  const route = await prisma.partnerBusRoute.findFirst({
    where: { id: routeId, partnerId: access.partnerId },
  });
  if (!route) return failure('BUS_ROUTE_NOT_FOUND', 'The operator route was not found.', 404);
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_JSON', 'Enter valid route controls.', 400);
  let status: 'ACTIVE' | 'PAUSED';
  try {
    status = normalizeBusRouteStatus(String(body.status ?? ''));
  } catch (error) {
    return failure(
      'INVALID_BUS_ROUTE_STATUS',
      error instanceof Error ? error.message : 'Enter a valid route status.',
      400,
    );
  }
  const data = await prisma.partnerBusRoute.update({ data: { status }, where: { id: route.id } });
  await recordPartnerAudit(access, {
    action: 'BUS_ROUTE_STATUS_UPDATED',
    entityId: route.id,
    entityType: 'BUS_ROUTE',
    metadata: { status },
    summary: `${route.origin} to ${route.destination} route ${status === 'ACTIVE' ? 'restored' : 'paused'}.`,
  });
  return Response.json({ data });
}
