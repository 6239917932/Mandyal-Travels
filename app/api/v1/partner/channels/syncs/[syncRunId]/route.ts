import { readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';

type Context = { params: Promise<{ syncRunId: string }> };
function failure(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

export async function PATCH(request: Request, context: Context): Promise<Response> {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL' || access.memberRole !== 'ADMIN')
    return failure('PARTNER_UNAUTHORIZED', 'Hotel partner administrator access is required.', 401);
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
  const updated = await prisma.hotelChannelSyncRun.update({
    data: { reconciliationNote: note, status: 'RECONCILED' },
    where: { id: run.id },
  });
  await recordPartnerAudit(access, {
    action: 'CHANNEL_SYNC_RECONCILED',
    entityId: run.id,
    entityType: 'HOTEL_CHANNEL_SYNC',
    summary: 'Recorded a channel synchronization reconciliation decision.',
  });
  return Response.json({ data: updated });
}
