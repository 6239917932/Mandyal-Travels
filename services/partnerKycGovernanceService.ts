import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  evaluatePartnerKycTransition,
  isPartnerKycDocumentStatus,
  type PartnerKycDocumentStatus,
} from '@/lib/partner/kycDocumentRules';
import {
  publicPartnerKycProjection,
  summarizePersistedPartnerKyc,
} from '@/lib/partner/kycPersistenceRules';

export class PartnerKycGovernanceError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 409,
  ) {
    super(message);
  }
}

const currentVersionInclude = {
  orderBy: { versionNumber: 'desc' as const },
  take: 1,
};

function todayUtc(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function assertPersistedStatus(value: string): PartnerKycDocumentStatus {
  if (!isPartnerKycDocumentStatus(value)) {
    throw new PartnerKycGovernanceError(
      'KYC_STATE_INVALID',
      'The stored document state requires administrator review.',
      500,
    );
  }
  return value;
}

export async function getApplicantKycChecklist(applicationId: string, applicantUserId: string) {
  const application = await prisma.partnerApplication.findFirst({
    include: {
      kycDocuments: {
        include: { versions: currentVersionInclude },
        orderBy: { documentType: 'asc' },
      },
    },
    where: { applicantUserId, id: applicationId },
  });
  if (!application) {
    throw new PartnerKycGovernanceError('APPLICATION_NOT_FOUND', 'Application not found.', 404);
  }
  const partnerType = application.partnerType;
  if (partnerType !== 'BUS' && partnerType !== 'CAR' && partnerType !== 'HOTEL') {
    throw new PartnerKycGovernanceError('PARTNER_TYPE_UNSUPPORTED', 'Partner type is unsupported.');
  }
  return {
    applicationId: application.id,
    documents: application.kycDocuments.map(publicPartnerKycProjection),
    status: application.kycStatus,
    summary: summarizePersistedPartnerKyc({
      documents: application.kycDocuments,
      partnerType,
      today: todayUtc(),
    }),
  };
}

export async function getPartnerKycChecklist(partnerId: string) {
  const application = await prisma.partnerApplication.findFirst({
    include: {
      kycDocuments: {
        include: { versions: currentVersionInclude },
        orderBy: { documentType: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    where: { partnerId, status: 'APPROVED' },
  });
  if (!application) {
    throw new PartnerKycGovernanceError(
      'KYC_APPLICATION_NOT_FOUND',
      'No approved onboarding record is linked to this supplier.',
      404,
    );
  }
  return getApplicantKycChecklist(application.id, application.applicantUserId);
}

export async function getAdminPartnerKycChecklist(partnerId: string) {
  const checklist = await getPartnerKycChecklist(partnerId);
  const documents = await prisma.partnerKycDocument.findMany({
    include: {
      events: {
        include: { actor: { select: { email: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      },
      versions: { orderBy: { versionNumber: 'desc' } },
    },
    orderBy: { documentType: 'asc' },
    where: { partnerId },
  });
  return {
    ...checklist,
    documents: documents.map((document) => ({
      ...publicPartnerKycProjection(document),
      events: document.events.map((event) => ({
        action: event.action,
        actor: event.actor
          ? `${event.actor.firstName} ${event.actor.lastName}`.trim() || event.actor.email
          : 'System',
        createdAt: event.createdAt.toISOString(),
        fromStatus: event.fromStatus,
        reason: event.reason,
        toStatus: event.toStatus,
      })),
      id: document.id,
      versions: document.versions.map((version) => ({
        byteSize: version.byteSize,
        contentType: version.contentType,
        createdAt: version.createdAt.toISOString(),
        originalFilename: version.originalFilename,
        storageStatus: version.storageStatus,
        versionNumber: version.versionNumber,
      })),
    })),
  };
}

export async function transitionPartnerKycDocument(input: {
  actorUserId: string;
  documentId: string;
  expectedVersion: number;
  reviewNote?: string | null;
  targetStatus: PartnerKycDocumentStatus;
}) {
  return prisma.$transaction(async (transaction) => {
    const current = await transaction.partnerKycDocument.findUnique({
      where: { id: input.documentId },
    });
    if (!current) {
      throw new PartnerKycGovernanceError('KYC_DOCUMENT_NOT_FOUND', 'Document not found.', 404);
    }
    const transition = evaluatePartnerKycTransition({
      currentVersion: current.lockVersion,
      expectedVersion: input.expectedVersion,
      expiresOn: current.expiresOn,
      from: assertPersistedStatus(current.status),
      reviewerUserId: input.actorUserId,
      reviewNote: input.reviewNote,
      to: input.targetStatus,
      today: todayUtc(),
    });
    if (!transition.ok) {
      throw new PartnerKycGovernanceError('KYC_TRANSITION_INVALID', transition.errors.join(' '));
    }
    const update = await transaction.partnerKycDocument.updateMany({
      data: {
        lockVersion: transition.value.nextVersion,
        reviewedAt: new Date(),
        reviewedByUserId: input.actorUserId,
        reviewNote: transition.value.reviewNote,
        status: input.targetStatus,
        submittedAt: input.targetStatus === 'SUBMITTED' ? new Date() : current.submittedAt,
      },
      where: { id: current.id, lockVersion: input.expectedVersion },
    });
    if (update.count !== 1) {
      throw new PartnerKycGovernanceError(
        'KYC_VERSION_CONFLICT',
        'Document changed. Refresh before reviewing.',
      );
    }
    await transaction.partnerKycDocumentEvent.create({
      data: {
        action: `KYC_DOCUMENT_${input.targetStatus}`,
        actorUserId: input.actorUserId,
        applicationId: current.applicationId,
        documentId: current.id,
        fromStatus: current.status,
        partnerId: current.partnerId,
        reason: transition.value.reviewNote,
        toStatus: input.targetStatus,
      },
    });
    return transaction.partnerKycDocument.findUniqueOrThrow({ where: { id: current.id } });
  });
}

export async function submitOwnedPartnerKycDocument(input: {
  actorUserId: string;
  applicationId?: string;
  documentId: string;
  expectedVersion: number;
  partnerId?: string;
}) {
  const document = await prisma.partnerKycDocument.findFirst({
    include: { application: { select: { applicantUserId: true } } },
    where: {
      id: input.documentId,
      ...(input.applicationId
        ? {
            applicationId: input.applicationId,
            application: { applicantUserId: input.actorUserId },
          }
        : { partnerId: input.partnerId }),
    },
  });
  if (!document) {
    throw new PartnerKycGovernanceError('KYC_DOCUMENT_NOT_FOUND', 'Document not found.', 404);
  }
  return transitionPartnerKycDocument({
    actorUserId: input.actorUserId,
    documentId: document.id,
    expectedVersion: input.expectedVersion,
    targetStatus: 'SUBMITTED',
  });
}
