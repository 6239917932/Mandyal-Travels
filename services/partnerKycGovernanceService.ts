import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  buildPartnerKycObjectKey,
  evaluatePartnerKycTransition,
  isPartnerKycDocumentStatus,
  type PartnerKycDocumentStatus,
  type PartnerKycDocumentMetadata,
  type PartnerKycDocumentType,
} from '@/lib/partner/kycDocumentRules';
import {
  publicPartnerKycProjection,
  partnerKycStorageReadiness,
  summarizePersistedPartnerKyc,
} from '@/lib/partner/kycPersistenceRules';
import { kycStorageEnvironment, requestPartnerKycUploadIntent } from './partnerKycStorageService';
import { randomUUID } from 'node:crypto';

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
  if (
    input.targetStatus === 'VERIFIED' &&
    !partnerKycStorageReadiness(kycStorageEnvironment()).ready
  ) {
    throw new PartnerKycGovernanceError(
      'KYC_STORAGE_NOT_CONFIGURED',
      'Identity verification is unavailable until private evidence storage, malware scanning and audited document access are activated. You can still request changes or reject invalid evidence.',
    );
  }
  return prisma.$transaction(async (transaction) => {
    const current = await transaction.partnerKycDocument.findUnique({
      include: { versions: currentVersionInclude },
      where: { id: input.documentId },
    });
    if (!current) {
      throw new PartnerKycGovernanceError('KYC_DOCUMENT_NOT_FOUND', 'Document not found.', 404);
    }
    if (input.targetStatus === 'VERIFIED' && current.versions[0]?.storageStatus !== 'SCAN_PASSED') {
      throw new PartnerKycGovernanceError(
        'KYC_SCAN_REQUIRED',
        'The latest document version must pass the configured malware and integrity scan before verification.',
      );
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

export async function recordPartnerKycScanResult(input: {
  byteSize: number;
  objectKey: string;
  sha256: string;
  status: 'CLEAN' | 'REJECTED';
  versionId: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const version = await transaction.partnerKycDocumentVersion.findUnique({
      include: { document: true },
      where: { id: input.versionId },
    });
    if (!version)
      throw new PartnerKycGovernanceError(
        'KYC_VERSION_NOT_FOUND',
        'Upload version not found.',
        404,
      );
    if (
      version.objectKey !== input.objectKey ||
      version.sha256 !== input.sha256 ||
      version.byteSize !== input.byteSize
    ) {
      throw new PartnerKycGovernanceError(
        'KYC_SCAN_MISMATCH',
        'Scan result did not match the upload intent.',
        409,
      );
    }
    const storageStatus = input.status === 'CLEAN' ? 'SCAN_PASSED' : 'SCAN_REJECTED';
    if (version.storageStatus === storageStatus) return { accepted: true, storageStatus };
    if (version.storageStatus !== 'INTENT_CREATED') {
      throw new PartnerKycGovernanceError(
        'KYC_SCAN_REPLAY_REJECTED',
        'Upload result has already been finalized.',
        409,
      );
    }
    await transaction.partnerKycDocumentVersion.update({
      data: { storageStatus, uploadedAt: new Date() },
      where: { id: version.id },
    });
    await transaction.partnerKycDocumentEvent.create({
      data: {
        action:
          storageStatus === 'SCAN_PASSED' ? 'KYC_UPLOAD_SCAN_PASSED' : 'KYC_UPLOAD_SCAN_REJECTED',
        applicationId: version.document.applicationId,
        documentId: version.documentId,
        metadataJson: JSON.stringify({
          versionId: version.id,
          versionNumber: version.versionNumber,
        }),
        partnerId: version.document.partnerId,
        reason:
          storageStatus === 'SCAN_REJECTED' ? 'Provider rejected the uploaded evidence.' : null,
      },
    });
    return { accepted: true, storageStatus };
  });
}

export async function createApplicantKycUploadIntent(input: {
  actorUserId: string;
  applicationId: string;
  documentType: PartnerKycDocumentType;
  issuedOn: string | null;
  expiresOn: string | null;
  metadata: PartnerKycDocumentMetadata;
  partnerId?: string;
}) {
  const application = await prisma.partnerApplication.findFirst({
    where: {
      id: input.applicationId,
      ...(input.partnerId
        ? { partnerId: input.partnerId, status: 'APPROVED' }
        : { applicantUserId: input.actorUserId }),
    },
  });
  if (!application)
    throw new PartnerKycGovernanceError('APPLICATION_NOT_FOUND', 'Application not found.', 404);
  if (application.partnerType !== 'HOTEL')
    throw new PartnerKycGovernanceError(
      'PARTNER_TYPE_DISABLED',
      'Only hotel partner evidence is accepted.',
      409,
    );

  return prisma.$transaction(async (transaction) => {
    const document = await transaction.partnerKycDocument.upsert({
      create: {
        applicationId: application.id,
        documentType: input.documentType,
        expiresOn: input.expiresOn,
        issuedOn: input.issuedOn,
      },
      update: { expiresOn: input.expiresOn, issuedOn: input.issuedOn },
      where: {
        applicationId_documentType: {
          applicationId: application.id,
          documentType: input.documentType,
        },
      },
    });
    const versionNumber = document.fileVersion + 1;
    const extension =
      input.metadata.contentType === 'application/pdf'
        ? 'pdf'
        : input.metadata.contentType === 'image/jpeg'
          ? 'jpg'
          : input.metadata.contentType === 'image/png'
            ? 'png'
            : 'webp';
    const objectKey = buildPartnerKycObjectKey({
      documentId: document.id,
      extension,
      partnerId: application.partnerId ?? application.id,
      uploadId: randomUUID().replaceAll('-', ''),
      version: versionNumber,
    });
    if (!objectKey)
      throw new PartnerKycGovernanceError(
        'KYC_OBJECT_KEY_INVALID',
        'Secure upload could not be prepared.',
        500,
      );
    const intent = await requestPartnerKycUploadIntent({ metadata: input.metadata, objectKey });
    const version = await transaction.partnerKycDocumentVersion.create({
      data: {
        byteSize: input.metadata.byteSize,
        contentType: input.metadata.contentType,
        createdByUserId: input.actorUserId,
        documentId: document.id,
        objectKey,
        originalFilename: input.metadata.originalFilename,
        sha256: input.metadata.sha256,
        uploadIntentExpiresAt: new Date(intent.expiresAt),
        versionNumber,
      },
    });
    await transaction.partnerKycDocument.update({
      data: { fileVersion: versionNumber, lockVersion: { increment: 1 }, status: 'DRAFT' },
      where: { id: document.id },
    });
    await transaction.partnerKycDocumentEvent.create({
      data: {
        action: 'KYC_UPLOAD_INTENT_CREATED',
        actorUserId: input.actorUserId,
        applicationId: application.id,
        documentId: document.id,
        metadataJson: JSON.stringify({ versionId: version.id, versionNumber }),
        partnerId: application.partnerId,
        toStatus: 'DRAFT',
      },
    });
    return {
      documentId: document.id,
      expiresAt: intent.expiresAt,
      headers: intent.headers,
      method: intent.method,
      uploadUrl: intent.uploadUrl,
      versionId: version.id,
    };
  });
}

export async function createPartnerKycUploadIntent(input: {
  actorUserId: string;
  documentType: PartnerKycDocumentType;
  expiresOn: string | null;
  issuedOn: string | null;
  metadata: PartnerKycDocumentMetadata;
  partnerId: string;
}) {
  const application = await prisma.partnerApplication.findFirst({
    orderBy: { createdAt: 'desc' },
    where: { partnerId: input.partnerId, status: 'APPROVED' },
  });
  if (!application)
    throw new PartnerKycGovernanceError(
      'KYC_APPLICATION_NOT_FOUND',
      'No approved onboarding record is linked to this supplier.',
      404,
    );
  return createApplicantKycUploadIntent({
    ...input,
    applicationId: application.id,
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
