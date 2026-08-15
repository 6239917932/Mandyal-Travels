import { getPlatformAdmin } from '@/lib/adminAuth';
import { readJsonObject } from '@/lib/api/request';
import { prisma } from '@/lib/prisma';
import { evaluatePropertyReview } from '@/lib/hotel/propertyApproval';
import type { ApiErrorResponse } from '@/types/commerce';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ partnerId: string; propertyId: string }> },
) {
  const admin = await getPlatformAdmin();
  if (!admin) return failure('ADMIN_REQUIRED', 'Platform administrator access is required.', 403);
  const body = await readJsonObject(request);
  const action = String(body?.action ?? '');
  const reviewNote = String(body?.reviewNote ?? '');
  const { partnerId, propertyId } = await context.params;
  const property = await prisma.partnerProperty.findFirst({
    include: { rooms: { where: { status: 'ACTIVE' } } },
    where: { id: propertyId, listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
  });
  if (!property) return failure('PROPERTY_NOT_FOUND', 'The supplier property was not found.', 404);
  const decision = evaluatePropertyReview({
    action,
    activeRoomCount: property.rooms.length,
    approvalStatus: property.approvalStatus,
    reviewNote,
  });
  if (!decision.valid) {
    const status = decision.code === 'INVALID_REVIEW_ACTION' || decision.code === 'REVIEW_NOTE_REQUIRED' ? 400 : 409;
    return failure(decision.code, decision.message, status);
  }
  const data = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.partnerProperty.update({
      data: {
        approvalNote: decision.reviewNote,
        approvalStatus: decision.approvalStatus,
        publicationStatus: decision.publicationStatus,
        reviewedAt: new Date(),
        reviewedByUserId: admin.id,
      },
      where: { id: property.id },
    });
    await transaction.partnerAuditLog.create({
      data: {
        action: action === 'APPROVE' ? 'PROPERTY_APPROVED' : 'PROPERTY_REJECTED',
        actorUserId: admin.id,
        entityId: property.id,
        entityType: 'PROPERTY',
        metadataJson: JSON.stringify({ reviewNoteLength: decision.reviewNote.length }),
        partnerId,
        summary: `${property.displayName} was ${action === 'APPROVE' ? 'approved and published' : 'returned for corrections'}.`,
      },
    });
    return updated;
  });
  return Response.json({ data });
}
