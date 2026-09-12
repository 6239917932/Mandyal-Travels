import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import {
  normalizeExternalReference,
  normalizeProviderName,
  ChannelRuleError,
} from '@/lib/hotel/channelRules';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';

function failure(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

export async function GET(request: Request): Promise<Response> {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL')
    return failure('PARTNER_UNAUTHORIZED', 'Hotel partner access is required.', 401);
  const [connections, properties] = await Promise.all([
    prisma.hotelChannelConnection.findMany({
      include: {
        propertyMappings: { include: { property: { select: { displayName: true } } } },
        syncRuns: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
      orderBy: { createdAt: 'desc' },
      where: { partnerId: access.partnerId },
    }),
    prisma.partnerProperty.findMany({
      orderBy: { displayName: 'asc' },
      select: { displayName: true, id: true },
      where: { partnerId: access.partnerId, status: 'ACTIVE' },
    }),
  ]);
  return Response.json({ connections, properties });
}

export async function POST(request: Request): Promise<Response> {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL' || access.memberRole !== 'ADMIN')
    return failure('PARTNER_UNAUTHORIZED', 'Hotel partner administrator access is required.', 401);
  if (access.mode !== 'integration-key' && !isSameOriginMutation(request))
    return failure('FORBIDDEN_ORIGIN', 'This request must come from the Mandyal portal.', 403);
  const partnerId = access.partnerId;
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_JSON', 'A valid JSON body is required.', 400);
  try {
    const providerName = normalizeProviderName(body.providerName);
    const externalAccountRef = normalizeExternalReference(body.externalAccountRef, 'Account');
    const connection = await prisma.$transaction(async (transaction) => {
      const created = await transaction.hotelChannelConnection.create({
        data: { externalAccountRef, partnerId, providerName },
      });
      await transaction.partnerAuditLog.create({
        data: {
          action: 'CHANNEL_CONNECTION_CREATED',
          actorUserId: access.userId,
          entityId: created.id,
          entityType: 'HOTEL_CHANNEL_CONNECTION',
          partnerId,
          summary: `Added ${providerName} to the manual sales-channel directory.`,
        },
      });
      return created;
    });
    return Response.json({ data: connection }, { status: 201 });
  } catch (error) {
    return error instanceof ChannelRuleError
      ? failure(error.code, error.message, 400)
      : failure('CHANNEL_CONNECTION_FAILED', 'The channel connection could not be created.', 409);
  }
}
