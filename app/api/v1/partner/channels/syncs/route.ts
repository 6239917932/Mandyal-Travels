import { readJsonObject } from '@/lib/api/request';
import { ChannelRuleError, normalizeSyncDirection } from '@/lib/hotel/channelRules';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';

function failure(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

export async function POST(request: Request): Promise<Response> {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL' || !access.userId)
    return failure('PARTNER_UNAUTHORIZED', 'Signed-in hotel partner access is required.', 401);
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
  try {
    const direction = normalizeSyncDirection(body.direction);
    const syncRun = await prisma.$transaction(async (transaction) => {
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
      return run;
    });
    await recordPartnerAudit(access, {
      action: 'CHANNEL_SYNC_REQUESTED',
      entityId: syncRun.id,
      entityType: 'HOTEL_CHANNEL_SYNC',
      metadata: { direction },
      summary: `Queued a ${direction.toLowerCase()} channel synchronization.`,
    });
    return Response.json({ data: syncRun }, { status: 202 });
  } catch (error) {
    return error instanceof ChannelRuleError
      ? failure(error.code, error.message, 400)
      : failure('CHANNEL_SYNC_FAILED', 'The synchronization request could not be queued.', 409);
  }
}
