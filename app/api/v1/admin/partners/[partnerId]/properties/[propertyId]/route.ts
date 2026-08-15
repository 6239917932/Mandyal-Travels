import { getPlatformAdmin } from '@/lib/adminAuth';
import { readJsonObject } from '@/lib/api/request';
import { prisma } from '@/lib/prisma';
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
  const reviewNote = String(body?.reviewNote ?? '').trim().slice(0, 500);
  if (!['APPROVE', 'REJECT'].includes(action)) {
    return failure('INVALID_REVIEW_ACTION', 'Choose approve or reject.', 400);
  }
  if (action === 'REJECT' && reviewNote.length < 10) {
    return failure('REVIEW_NOTE_REQUIRED', 'Explain the required corrections before rejecting.', 400);
  }
  const { partnerId, propertyId } = await context.params;
  const property = await prisma.partnerProperty.findFirst({
    include: { rooms: { where: { status: 'ACTIVE' } } },
    where: { id: propertyId, listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
  });
  if (!property) return failure('PROPERTY_NOT_FOUND', 'The supplier property was not found.', 404);
  if (property.approvalStatus !== 'PENDING_REVIEW') {
    return failure('PROPERTY_NOT_PENDING', 'Only a pending property can be reviewed.', 409);
  }
  if (action === 'APPROVE' && property.rooms.length === 0) {
    return failure('ROOM_REQUIRED', 'A property needs an active room before approval.', 409);
  }
  const data = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.partnerProperty.update({
      data: {
        approvalNote: reviewNote,
        approvalStatus: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        publicationStatus: action === 'APPROVE' ? 'PUBLISHED' : 'DRAFT',
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
        metadataJson: JSON.stringify({ reviewNoteLength: reviewNote.length }),
        partnerId,
        summary: `${property.displayName} was ${action === 'APPROVE' ? 'approved and published' : 'returned for corrections'}.`,
      },
    });
    return updated;
  });
  return Response.json({ data });
}
