import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';

type Context = { params: Promise<{ syncRunId: string }> };
function failure(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

export async function PATCH(request: Request, context: Context): Promise<Response> {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL' || access.memberRole !== 'ADMIN')
    return failure('PARTNER_UNAUTHORIZED', 'Hotel partner administrator access is required.', 401);
  if (access.mode !== 'integration-key' && !isSameOriginMutation(request))
    return failure('FORBIDDEN_ORIGIN', 'This request must come from the Mandyal portal.', 403);
  const { syncRunId } = await context.params;
  const body = await readJsonObject(request);
  const note =
    typeof body?.reconciliationNote === 'string'
      ? body.reconciliationNote.trim().replace(/\s+/g, ' ')
      : '';
  if (note.length < 5 || note.length > 500)
    return failure(
      'INVALID_RECONCILIATION_NOTE',
      'A reconciliation note of 5 to 500 characters is required.',
      400,
    );
  const run = await prisma.hotelChannelSyncRun.findFirst({
    where: { connection: { partnerId: access.partnerId }, id: syncRunId },
  });
  if (!run) return failure('SYNC_RUN_NOT_FOUND', 'The synchronization run was not found.', 404);
  if (!['FAILED', 'COMPLETED_WITH_CONFLICTS'].includes(run.status))
    return failure(
      'SYNC_NOT_RECONCILABLE',
      'Only failed or conflicted runs can be reconciled.',
      409,
    );
  try {
    const updated = await prisma.$transaction(async (transaction) => {
      const claimed = await transaction.hotelChannelSyncRun.updateMany({
        data: { reconciliationNote: note, status: 'RECONCILED' },
        where: { id: run.id, status: run.status },
      });
      if (claimed.count !== 1) throw new Error('STALE_CHANNEL_SYNC');
      await transaction.partnerAuditLog.create({
        data: {
          action: 'CHANNEL_SYNC_RECONCILED',
          actorUserId: access.userId,
          entityId: run.id,
          entityType: 'HOTEL_CHANNEL_SYNC',
          partnerId: access.partnerId!,
          summary: 'Recorded a channel synchronization reconciliation decision.',
        },
      });
      return transaction.hotelChannelSyncRun.findUniqueOrThrow({ where: { id: run.id } });
    });
    return Response.json({ data: updated });
  } catch (error) {
    return failure(
      error instanceof Error && error.message === 'STALE_CHANNEL_SYNC'
        ? 'STALE_CHANNEL_SYNC'
        : 'CHANNEL_RECONCILIATION_FAILED',
      'The synchronization changed before reconciliation. Refresh and review the latest state.',
      409,
    );
  }
}
