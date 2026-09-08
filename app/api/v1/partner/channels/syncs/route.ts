import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import {
  channelConnectionReadiness,
  ChannelRuleError,
  normalizeSyncDirection,
} from '@/lib/hotel/channelRules';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';

function failure(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

export async function POST(request: Request): Promise<Response> {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL' || access.memberRole !== 'ADMIN')
    return failure('PARTNER_UNAUTHORIZED', 'Hotel partner administrator access is required.', 401);
  if (access.mode !== 'integration-key' && !isSameOriginMutation(request))
    return failure('FORBIDDEN_ORIGIN', 'This request must come from the Mandyal portal.', 403);
  const body = await readJsonObject(request);
  if (!body || typeof body.connectionId !== 'string')
    return failure('INVALID_SYNC_REQUEST', 'A channel connection is required.', 400);
  const connection = await prisma.hotelChannelConnection.findFirst({
    include: { propertyMappings: { where: { status: 'ACTIVE' } } },
    where: { id: body.connectionId, partnerId: access.partnerId },
  });
  if (!connection)
    return failure('CHANNEL_NOT_FOUND', 'The channel connection was not found.', 404);
  if (connection.propertyMappings.length === 0)
    return failure(
      'CHANNEL_MAPPING_REQUIRED',
      'Map at least one property before requesting synchronization.',
      409,
    );
  const readiness = channelConnectionReadiness(connection);
  if (!readiness.ready)
    return failure(
      readiness.code,
      'A recently verified, active provider connection is required before synchronization can be dispatched.',
      409,
    );
  try {
    const direction = normalizeSyncDirection(body.direction);
    const syncRun = await prisma.$transaction(
      async (transaction) => {
        const inFlight = await transaction.hotelChannelSyncRun.count({
          where: {
            connectionId: connection.id,
            status: { in: ['QUEUED', 'PROCESSING'] },
          },
        });
        if (inFlight)
          throw new ChannelRuleError(
            'CHANNEL_SYNC_IN_PROGRESS',
            'A synchronization is already in progress for this connection.',
          );
        const run = await transaction.hotelChannelSyncRun.create({
          data: { connectionId: connection.id, direction, requestedByUserId: access.userId },
        });
        await transaction.integrationOutboxEvent.create({
          data: {
            aggregateId: run.id,
            aggregateType: 'HOTEL_CHANNEL_SYNC',
            dedupeKey: `hotel-channel-sync:${run.id}`,
            eventType: 'HOTEL_CHANNEL_SYNC_REQUESTED',
            payloadJson: JSON.stringify({
              connectionId: connection.id,
              direction,
              partnerId: access.partnerId,
              syncRunId: run.id,
            }),
          },
        });
        await transaction.partnerAuditLog.create({
          data: {
            action: 'CHANNEL_SYNC_REQUESTED',
            actorUserId: access.userId,
            entityId: run.id,
            entityType: 'HOTEL_CHANNEL_SYNC',
            metadataJson: JSON.stringify({ direction }),
            partnerId: access.partnerId!,
            summary: `Queued a ${direction.toLowerCase()} channel synchronization dispatch.`,
          },
        });
        return run;
      },
      { isolationLevel: 'Serializable' },
    );
    return Response.json({ data: syncRun }, { status: 202 });
  } catch (error) {
    return error instanceof ChannelRuleError
      ? failure(error.code, error.message, error.code === 'CHANNEL_SYNC_IN_PROGRESS' ? 409 : 400)
      : failure('CHANNEL_SYNC_FAILED', 'The synchronization request could not be queued.', 409);
  }
}
