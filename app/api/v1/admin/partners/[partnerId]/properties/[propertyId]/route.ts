import { getPlatformAdmin } from '@/lib/adminAuth';
import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { prisma } from '@/lib/prisma';
import { evaluatePropertyReview } from '@/lib/hotel/propertyApproval';
import type { ApiErrorResponse } from '@/types/commerce';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ partnerId: string; propertyId: string }> },
) {
  if (!isSameOriginMutation(request))
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels portal.', 403);
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
  if (action === 'PAUSE' || action === 'ARCHIVE') {
    const normalizedReason = reviewNote.trim().replace(/\s+/g, ' ').slice(0, 500);
    if (normalizedReason.length < 10)
      return failure('REVIEW_NOTE_REQUIRED', 'Enter a reason of at least 10 characters.', 400);
    const data = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.partnerProperty.update({
        data: {
          approvalNote: normalizedReason,
          publicationStatus: action === 'ARCHIVE' ? 'ARCHIVED' : 'PAUSED',
          status: action === 'ARCHIVE' ? 'ARCHIVED' : property.status,
          reviewedAt: new Date(),
          reviewedByUserId: admin.id,
        },
        where: { id: property.id },
      });
      await transaction.partnerAuditLog.create({
        data: {
          action: `PROPERTY_${action}`,
          actorUserId: admin.id,
          entityId: property.id,
          entityType: 'PROPERTY',
          metadataJson: JSON.stringify({ reviewNoteLength: normalizedReason.length }),
          partnerId,
          summary: `${property.displayName} was ${action === 'ARCHIVE' ? 'archived' : 'paused'} by a platform administrator. Existing records were preserved.`,
        },
      });
      return updated;
    });
    return Response.json({ data });
  }
  if (action === 'APPROVE') {
    const openHighRiskSignals = await prisma.riskSignal.count({
      where: {
        severity: 'HIGH',
        status: 'OPEN',
        subjectId: property.id,
        subjectType: 'PARTNER_PROPERTY',
      },
    });
    if (openHighRiskSignals > 0)
      return failure(
        'HIGH_RISK_REVIEW_REQUIRED',
        'Resolve all open high-risk signals before approving this property.',
        409,
      );
  }
  const decision = evaluatePropertyReview({
    action,
    activeRoomCount: property.rooms.length,
    approvalStatus: property.approvalStatus,
    reviewNote,
  });
  if (!decision.valid) {
    const status =
      decision.code === 'INVALID_REVIEW_ACTION' || decision.code === 'REVIEW_NOTE_REQUIRED'
        ? 400
        : 409;
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
