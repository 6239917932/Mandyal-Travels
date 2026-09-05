import { getPlatformAdmin } from '@/lib/adminAuth';
import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { prisma } from '@/lib/prisma';
import { evaluatePropertyReview } from '@/lib/hotel/propertyApproval';
import {
  PartnerOperationsError,
  partnerOperationsService,
} from '@/services/partnerOperationsService';
import type { ApiErrorResponse } from '@/types/commerce';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

class StaleReviewError extends Error {}

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
    where: { id: propertyId, listingSource: 'MANAGED', partnerId },
  });
  if (!property) return failure('PROPERTY_NOT_FOUND', 'The supplier property was not found.', 404);
  const expectedVersionText = String(body?.expectedUpdatedAt ?? '');
  const expectedUpdatedAt = new Date(expectedVersionText);
  if (
    Number.isNaN(expectedUpdatedAt.getTime()) ||
    expectedUpdatedAt.toISOString() !== expectedVersionText
  )
    return failure('INVALID_VERSION', 'Refresh the supplier record before saving a decision.', 409);
  if (property.updatedAt.getTime() !== expectedUpdatedAt.getTime())
    return failure(
      'LISTING_CHANGED',
      'This property changed after the review was opened. Refresh and review the latest version.',
      409,
    );
  if (action === 'RESTORE') {
    const normalizedReason = reviewNote.trim().replace(/\s+/g, ' ').slice(0, 500);
    if (normalizedReason.length < 10)
      return failure(
        'REVIEW_NOTE_REQUIRED',
        'Enter a restore reason of at least 10 characters.',
        400,
      );
    if (property.status !== 'ARCHIVED' && property.publicationStatus !== 'ARCHIVED')
      return failure('PROPERTY_NOT_ARCHIVED', 'Only an archived property can be restored.', 409);
    try {
      const data = await prisma.$transaction(async (transaction) => {
        const result = await transaction.partnerProperty.updateMany({
          data: {
            approvalNote: normalizedReason,
            approvalStatus: 'PENDING_REVIEW',
            publicationStatus: 'DRAFT',
            reviewedAt: new Date(),
            reviewedByUserId: admin.id,
            status: 'ACTIVE',
            submittedAt: null,
          },
          where: { id: property.id, updatedAt: expectedUpdatedAt },
        });
        if (result.count !== 1) throw new StaleReviewError();
        await transaction.partnerAuditLog.create({
          data: {
            action: 'PROPERTY_RESTORED',
            actorUserId: admin.id,
            entityId: property.id,
            entityType: 'PROPERTY',
            metadataJson: JSON.stringify({ reviewNoteLength: normalizedReason.length }),
            partnerId,
            summary: `${property.displayName} was restored to private draft review by a platform administrator.`,
          },
        });
        return transaction.partnerProperty.findUniqueOrThrow({ where: { id: property.id } });
      });
      return Response.json({ data });
    } catch (error) {
      return error instanceof StaleReviewError
        ? failure(
            'LISTING_CHANGED',
            'This property changed while it was being restored. Refresh and review the latest version.',
            409,
          )
        : failure('PROPERTY_RESTORE_FAILED', 'The property could not be restored.', 500);
    }
  }
  if (property.status === 'ARCHIVED' || property.publicationStatus === 'ARCHIVED')
    return failure('PROPERTY_ARCHIVED', 'Restore this property before making other changes.', 409);
  if (action === 'UPDATE_LISTING') {
    try {
      const data = await partnerOperationsService.adminUpdatePropertyListing(
        partnerId,
        propertyId,
        admin.id,
        {
          amenities: String(body?.amenities ?? '').split(','),
          checkInTime: String(body?.checkInTime ?? ''),
          checkOutTime: String(body?.checkOutTime ?? ''),
          childrenAllowed: body?.childrenAllowed === true,
          city: String(body?.city ?? ''),
          contactEmail: String(body?.contactEmail ?? ''),
          contactPhone: String(body?.contactPhone ?? ''),
          country: String(body?.country ?? ''),
          description: String(body?.description ?? ''),
          displayName: String(body?.displayName ?? ''),
          district: String(body?.district ?? ''),
          expectedUpdatedAt: String(body?.expectedUpdatedAt ?? ''),
          imageUrl: String(body?.imageUrl ?? ''),
          imageUrls: String(body?.imageUrls ?? '').split('\n'),
          landmarks: String(body?.landmarks ?? '').split('\n'),
          languages: String(body?.languages ?? '').split(','),
          latitude: Number(body?.latitude),
          locality: String(body?.locality ?? ''),
          locationAliases: String(body?.locationAliases ?? '').split(','),
          longitude: Number(body?.longitude),
          minimumCheckInAge: Number(body?.minimumCheckInAge),
          petsAllowed: body?.petsAllowed === true,
          policies: String(body?.policies ?? '').split('\n'),
          postalCode: String(body?.postalCode ?? ''),
          propertyType: String(body?.propertyType ?? ''),
          smokingAllowed: body?.smokingAllowed === true,
          starRating: Number(body?.starRating),
          state: String(body?.state ?? ''),
          streetAddress: String(body?.streetAddress ?? ''),
          tehsil: String(body?.tehsil ?? ''),
        },
      );
      return Response.json({ data });
    } catch (error) {
      return error instanceof PartnerOperationsError
        ? failure(error.code, error.message, 409)
        : failure('PROPERTY_UPDATE_FAILED', 'The listing changes could not be saved.', 500);
    }
  }
  if (action === 'PAUSE' || action === 'ARCHIVE') {
    const normalizedReason = reviewNote.trim().replace(/\s+/g, ' ').slice(0, 500);
    if (normalizedReason.length < 10)
      return failure('REVIEW_NOTE_REQUIRED', 'Enter a reason of at least 10 characters.', 400);
    try {
      const data = await prisma.$transaction(async (transaction) => {
        const result = await transaction.partnerProperty.updateMany({
          data: {
            approvalNote: normalizedReason,
            publicationStatus: action === 'ARCHIVE' ? 'ARCHIVED' : 'PAUSED',
            status: action === 'ARCHIVE' ? 'ARCHIVED' : property.status,
            reviewedAt: new Date(),
            reviewedByUserId: admin.id,
          },
          where: { id: property.id, updatedAt: expectedUpdatedAt },
        });
        if (result.count !== 1) throw new StaleReviewError();
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
        return transaction.partnerProperty.findUniqueOrThrow({ where: { id: property.id } });
      });
      return Response.json({ data });
    } catch (error) {
      return error instanceof StaleReviewError
        ? failure(
            'LISTING_CHANGED',
            'This property changed while the decision was being saved. Refresh and review the latest version.',
            409,
          )
        : failure('PROPERTY_REVIEW_FAILED', 'The property decision could not be saved.', 500);
    }
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
  try {
    const data = await prisma.$transaction(async (transaction) => {
      const result = await transaction.partnerProperty.updateMany({
        data: {
          approvalNote: decision.reviewNote,
          approvalStatus: decision.approvalStatus,
          publicationStatus: decision.publicationStatus,
          reviewedAt: new Date(),
          reviewedByUserId: admin.id,
        },
        where: { id: property.id, updatedAt: expectedUpdatedAt },
      });
      if (result.count !== 1) throw new StaleReviewError();
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
      return transaction.partnerProperty.findUniqueOrThrow({ where: { id: property.id } });
    });
    return Response.json({ data });
  } catch (error) {
    return error instanceof StaleReviewError
      ? failure(
          'LISTING_CHANGED',
          'This property changed while the decision was being saved. Refresh and review the latest version.',
          409,
        )
      : failure('PROPERTY_REVIEW_FAILED', 'The property decision could not be saved.', 500);
  }
}
