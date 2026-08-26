export const PARTNER_KYC_DOCUMENT_TYPES = [
  'BUSINESS_REGISTRATION',
  'PAN',
  'GST_REGISTRATION',
  'REGISTERED_ADDRESS_PROOF',
  'AUTHORIZED_REPRESENTATIVE_ID',
  'BANK_ACCOUNT_PROOF',
  'PARTNER_CONTRACT',
  'HOTEL_OPERATING_LICENCE',
  'VEHICLE_REGISTRATION',
  'VEHICLE_INSURANCE',
  'VEHICLE_PERMIT',
  'DRIVER_LICENCE',
] as const;

export type PartnerKycDocumentType = (typeof PARTNER_KYC_DOCUMENT_TYPES)[number];
export type PartnerKycPartnerType = 'BUS' | 'CAR' | 'HOTEL';

export const PARTNER_KYC_DOCUMENT_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'CHANGES_REQUESTED',
  'VERIFIED',
  'REJECTED',
  'EXPIRED',
  'REVOKED',
  'SUPERSEDED',
] as const;

export type PartnerKycDocumentStatus = (typeof PARTNER_KYC_DOCUMENT_STATUSES)[number];
export type PartnerKycAccessClass = 'KYC_RESTRICTED' | 'SENSITIVE_IDENTITY';
export type PartnerKycRetentionClass =
  | 'CONTRACT_AND_COMMERCIAL'
  | 'IDENTITY_AND_DUE_DILIGENCE'
  | 'OPERATIONAL_COMPLIANCE'
  | 'TAX_AND_FINANCE';

export interface PartnerKycDocumentMetadataInput {
  byteSize: unknown;
  contentType: unknown;
  originalFilename: unknown;
  sha256: unknown;
}

export interface PartnerKycDocumentMetadata {
  byteSize: number;
  contentType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';
  originalFilename: string;
  sha256: string;
}

export interface PartnerKycDocumentPolicy {
  accessClass: PartnerKycAccessClass;
  allowedPartnerTypes: readonly PartnerKycPartnerType[];
  expiry: 'FORBIDDEN' | 'OPTIONAL' | 'REQUIRED';
  retentionClass: PartnerKycRetentionClass;
}

export type PartnerKycRuleResult<T> =
  { ok: true; value: T } | { errors: readonly string[]; ok: false };

const ALL_PARTNER_TYPES = ['BUS', 'CAR', 'HOTEL'] as const;
const TRANSPORT_PARTNER_TYPES = ['BUS', 'CAR'] as const;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const MAX_DOCUMENT_VERSION = 1_000;
const REVIEW_NOTE_MIN_LENGTH = 10;
const REVIEW_NOTE_MAX_LENGTH = 500;
const SAFE_IDENTIFIER_PATTERN = /^[a-zA-Z0-9_-]{1,120}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ALLOWED_CONTENT_TYPES = new Set<PartnerKycDocumentMetadata['contentType']>([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const DOCUMENT_POLICIES: Record<PartnerKycDocumentType, PartnerKycDocumentPolicy> = {
  AUTHORIZED_REPRESENTATIVE_ID: {
    accessClass: 'SENSITIVE_IDENTITY',
    allowedPartnerTypes: ALL_PARTNER_TYPES,
    expiry: 'OPTIONAL',
    retentionClass: 'IDENTITY_AND_DUE_DILIGENCE',
  },
  BANK_ACCOUNT_PROOF: {
    accessClass: 'SENSITIVE_IDENTITY',
    allowedPartnerTypes: ALL_PARTNER_TYPES,
    expiry: 'OPTIONAL',
    retentionClass: 'TAX_AND_FINANCE',
  },
  BUSINESS_REGISTRATION: {
    accessClass: 'KYC_RESTRICTED',
    allowedPartnerTypes: ALL_PARTNER_TYPES,
    expiry: 'FORBIDDEN',
    retentionClass: 'IDENTITY_AND_DUE_DILIGENCE',
  },
  DRIVER_LICENCE: {
    accessClass: 'SENSITIVE_IDENTITY',
    allowedPartnerTypes: TRANSPORT_PARTNER_TYPES,
    expiry: 'REQUIRED',
    retentionClass: 'OPERATIONAL_COMPLIANCE',
  },
  GST_REGISTRATION: {
    accessClass: 'KYC_RESTRICTED',
    allowedPartnerTypes: ALL_PARTNER_TYPES,
    expiry: 'FORBIDDEN',
    retentionClass: 'TAX_AND_FINANCE',
  },
  HOTEL_OPERATING_LICENCE: {
    accessClass: 'KYC_RESTRICTED',
    allowedPartnerTypes: ['HOTEL'],
    expiry: 'REQUIRED',
    retentionClass: 'OPERATIONAL_COMPLIANCE',
  },
  PAN: {
    accessClass: 'SENSITIVE_IDENTITY',
    allowedPartnerTypes: ALL_PARTNER_TYPES,
    expiry: 'FORBIDDEN',
    retentionClass: 'TAX_AND_FINANCE',
  },
  PARTNER_CONTRACT: {
    accessClass: 'KYC_RESTRICTED',
    allowedPartnerTypes: ALL_PARTNER_TYPES,
    expiry: 'OPTIONAL',
    retentionClass: 'CONTRACT_AND_COMMERCIAL',
  },
  REGISTERED_ADDRESS_PROOF: {
    accessClass: 'SENSITIVE_IDENTITY',
    allowedPartnerTypes: ALL_PARTNER_TYPES,
    expiry: 'OPTIONAL',
    retentionClass: 'IDENTITY_AND_DUE_DILIGENCE',
  },
  VEHICLE_INSURANCE: {
    accessClass: 'KYC_RESTRICTED',
    allowedPartnerTypes: TRANSPORT_PARTNER_TYPES,
    expiry: 'REQUIRED',
    retentionClass: 'OPERATIONAL_COMPLIANCE',
  },
  VEHICLE_PERMIT: {
    accessClass: 'KYC_RESTRICTED',
    allowedPartnerTypes: TRANSPORT_PARTNER_TYPES,
    expiry: 'REQUIRED',
    retentionClass: 'OPERATIONAL_COMPLIANCE',
  },
  VEHICLE_REGISTRATION: {
    accessClass: 'KYC_RESTRICTED',
    allowedPartnerTypes: TRANSPORT_PARTNER_TYPES,
    expiry: 'REQUIRED',
    retentionClass: 'OPERATIONAL_COMPLIANCE',
  },
};

const STATUS_TRANSITIONS: Record<PartnerKycDocumentStatus, readonly PartnerKycDocumentStatus[]> = {
  CHANGES_REQUESTED: ['SUBMITTED', 'SUPERSEDED'],
  DRAFT: ['SUBMITTED', 'SUPERSEDED'],
  EXPIRED: ['SUPERSEDED'],
  REJECTED: ['SUPERSEDED'],
  REVOKED: ['SUPERSEDED'],
  SUBMITTED: ['UNDER_REVIEW', 'SUPERSEDED'],
  SUPERSEDED: [],
  UNDER_REVIEW: ['CHANGES_REQUESTED', 'REJECTED', 'VERIFIED'],
  VERIFIED: ['EXPIRED', 'REVOKED', 'SUPERSEDED'],
};

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function cleanFilename(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const filename = value.trim().replace(/\s+/g, ' ');
  if (
    filename.length < 1 ||
    filename.length > 120 ||
    /[\\/\u0000-\u001f\u007f]/.test(filename) ||
    filename === '.' ||
    filename === '..'
  ) {
    return undefined;
  }
  return filename;
}

export function isPartnerKycDocumentType(value: unknown): value is PartnerKycDocumentType {
  return (
    typeof value === 'string' && (PARTNER_KYC_DOCUMENT_TYPES as readonly string[]).includes(value)
  );
}

export function isPartnerKycDocumentStatus(value: unknown): value is PartnerKycDocumentStatus {
  return (
    typeof value === 'string' &&
    (PARTNER_KYC_DOCUMENT_STATUSES as readonly string[]).includes(value)
  );
}

export function partnerKycDocumentPolicy(
  documentType: PartnerKycDocumentType,
): PartnerKycDocumentPolicy {
  return DOCUMENT_POLICIES[documentType];
}

export function requiredPartnerKycDocuments(
  partnerType: PartnerKycPartnerType,
): readonly PartnerKycDocumentType[] {
  const shared: PartnerKycDocumentType[] = [
    'BUSINESS_REGISTRATION',
    'PAN',
    'GST_REGISTRATION',
    'REGISTERED_ADDRESS_PROOF',
    'AUTHORIZED_REPRESENTATIVE_ID',
    'BANK_ACCOUNT_PROOF',
    'PARTNER_CONTRACT',
  ];
  if (partnerType === 'HOTEL') return [...shared, 'HOTEL_OPERATING_LICENCE'];
  return [
    ...shared,
    'VEHICLE_REGISTRATION',
    'VEHICLE_INSURANCE',
    'VEHICLE_PERMIT',
    'DRIVER_LICENCE',
  ];
}

export function normalizePartnerKycMetadata(
  input: PartnerKycDocumentMetadataInput,
): PartnerKycRuleResult<PartnerKycDocumentMetadata> {
  const errors: string[] = [];
  const originalFilename = cleanFilename(input.originalFilename);
  const contentType =
    typeof input.contentType === 'string' &&
    ALLOWED_CONTENT_TYPES.has(input.contentType as PartnerKycDocumentMetadata['contentType'])
      ? (input.contentType as PartnerKycDocumentMetadata['contentType'])
      : undefined;
  const sha256 = typeof input.sha256 === 'string' ? input.sha256.trim().toLowerCase() : '';
  if (!Number.isSafeInteger(input.byteSize) || (input.byteSize as number) < 1) {
    errors.push('Document size must be a positive integer.');
  } else if ((input.byteSize as number) > MAX_DOCUMENT_BYTES) {
    errors.push('Document size exceeds the 10 MB limit.');
  }
  if (!contentType) errors.push('Document content type is not allowed.');
  if (!originalFilename) errors.push('Document filename is unsafe or invalid.');
  if (!SHA256_PATTERN.test(sha256)) errors.push('Document SHA-256 digest is invalid.');
  if (errors.length || !contentType || !originalFilename) return { errors, ok: false };
  return {
    ok: true,
    value: {
      byteSize: input.byteSize as number,
      contentType,
      originalFilename,
      sha256,
    },
  };
}

export function buildPartnerKycObjectKey(input: {
  documentId: string;
  extension: 'jpeg' | 'jpg' | 'pdf' | 'png' | 'webp';
  partnerId: string;
  uploadId: string;
  version: number;
}): string | undefined {
  if (
    !SAFE_IDENTIFIER_PATTERN.test(input.partnerId) ||
    !SAFE_IDENTIFIER_PATTERN.test(input.documentId) ||
    !Number.isInteger(input.version) ||
    input.version < 1 ||
    input.version > MAX_DOCUMENT_VERSION
  ) {
    return undefined;
  }
  if (!SAFE_IDENTIFIER_PATTERN.test(input.uploadId)) return undefined;
  return `partners/${input.partnerId}/kyc/${input.documentId}/v${input.version}/${input.uploadId}.${input.extension}`;
}

export function validatePartnerKycDocumentDates(input: {
  documentType: PartnerKycDocumentType;
  expiresOn?: string | null;
  issuedOn?: string | null;
  today: string;
}): PartnerKycRuleResult<{ expiresOn: string | null; issuedOn: string | null }> {
  const errors: string[] = [];
  const policy = partnerKycDocumentPolicy(input.documentType);
  const issuedOn = input.issuedOn?.trim() || null;
  const expiresOn = input.expiresOn?.trim() || null;
  if (!isIsoDate(input.today)) errors.push('Review date is invalid.');
  if (issuedOn && !isIsoDate(issuedOn)) errors.push('Issue date is invalid.');
  if (expiresOn && !isIsoDate(expiresOn)) errors.push('Expiry date is invalid.');
  if (issuedOn && isIsoDate(input.today) && issuedOn > input.today) {
    errors.push('Issue date cannot be in the future.');
  }
  if (policy.expiry === 'REQUIRED' && !expiresOn) errors.push('Expiry date is required.');
  if (policy.expiry === 'FORBIDDEN' && expiresOn) {
    errors.push('This permanent document must not have an expiry date.');
  }
  if (issuedOn && expiresOn && issuedOn >= expiresOn) {
    errors.push('Expiry date must be after the issue date.');
  }
  if (expiresOn && isIsoDate(input.today) && expiresOn <= input.today) {
    errors.push('An expired document cannot be submitted as current evidence.');
  }
  return errors.length ? { errors, ok: false } : { ok: true, value: { expiresOn, issuedOn } };
}

export function evaluatePartnerKycTransition(input: {
  currentVersion: number;
  expectedVersion: number;
  expiresOn?: string | null;
  from: PartnerKycDocumentStatus;
  reviewerUserId?: string | null;
  reviewNote?: string | null;
  to: PartnerKycDocumentStatus;
  today: string;
}): PartnerKycRuleResult<{ nextVersion: number; reviewNote: string | null }> {
  const errors: string[] = [];
  const note = input.reviewNote?.trim().replace(/\s+/g, ' ') || null;
  if (
    !Number.isInteger(input.currentVersion) ||
    input.currentVersion < 1 ||
    input.currentVersion > MAX_DOCUMENT_VERSION
  ) {
    errors.push('Current document version is invalid.');
  }
  if (input.expectedVersion !== input.currentVersion) {
    errors.push('Document version changed. Refresh before reviewing.');
  }
  if (input.currentVersion >= MAX_DOCUMENT_VERSION) {
    errors.push('Document has reached the maximum supported version.');
  }
  if (!STATUS_TRANSITIONS[input.from].includes(input.to)) {
    errors.push(`Transition from ${input.from} to ${input.to} is not allowed.`);
  }
  const reviewAction = [
    'CHANGES_REQUESTED',
    'REJECTED',
    'REVOKED',
    'UNDER_REVIEW',
    'VERIFIED',
  ].includes(input.to);
  const reviewerUserId = input.reviewerUserId?.trim() || '';
  if (reviewAction && !SAFE_IDENTIFIER_PATTERN.test(reviewerUserId)) {
    errors.push('A valid reviewer account is required for this transition.');
  }
  const reasonRequired = ['CHANGES_REQUESTED', 'REJECTED', 'REVOKED', 'VERIFIED'].includes(
    input.to,
  );
  if (reasonRequired && (!note || note.length < REVIEW_NOTE_MIN_LENGTH)) {
    errors.push(`Review note must contain at least ${REVIEW_NOTE_MIN_LENGTH} characters.`);
  }
  if (note && note.length > REVIEW_NOTE_MAX_LENGTH) {
    errors.push(`Review note cannot exceed ${REVIEW_NOTE_MAX_LENGTH} characters.`);
  }
  if (input.to === 'VERIFIED') {
    if (!isIsoDate(input.today)) errors.push('Review date is invalid.');
    if (input.expiresOn && !isIsoDate(input.expiresOn)) {
      errors.push('Expiry date is invalid.');
    } else if (input.expiresOn && input.expiresOn <= input.today) {
      errors.push('An expired document cannot be verified.');
    }
  }
  return errors.length
    ? { errors, ok: false }
    : { ok: true, value: { nextVersion: input.currentVersion + 1, reviewNote: note } };
}

export function effectivePartnerKycStatus(input: {
  expiresOn?: string | null;
  status: PartnerKycDocumentStatus;
  today: string;
}): PartnerKycDocumentStatus {
  return input.status === 'VERIFIED' &&
    input.expiresOn &&
    isIsoDate(input.expiresOn) &&
    isIsoDate(input.today) &&
    input.expiresOn <= input.today
    ? 'EXPIRED'
    : input.status;
}

export function partnerKycRetentionRule(documentType: PartnerKycDocumentType) {
  return {
    automaticDeletionAllowed: false as const,
    legalHoldEligible: true as const,
    retentionClass: DOCUMENT_POLICIES[documentType].retentionClass,
    reviewRequiredBeforeDeletion: true as const,
  };
}

export function partnerKycAccessRule(documentType: PartnerKycDocumentType) {
  const accessClass = DOCUMENT_POLICIES[documentType].accessClass;
  return {
    accessClass,
    auditEveryRead: true as const,
    downloadableByPartnerMember: false as const,
    permittedRoles:
      accessClass === 'SENSITIVE_IDENTITY'
        ? (['KYC_REVIEWER', 'PLATFORM_ADMIN'] as const)
        : (['COMPLIANCE_AUDITOR', 'KYC_REVIEWER', 'PLATFORM_ADMIN'] as const),
    publicAccess: false as const,
  };
}
