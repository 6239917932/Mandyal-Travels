import {
  effectivePartnerKycStatus,
  requiredPartnerKycDocuments,
  type PartnerKycDocumentStatus,
  type PartnerKycDocumentType,
  type PartnerKycPartnerType,
} from './kycDocumentRules.ts';

export type PersistedPartnerKycSummary = {
  complete: boolean;
  expired: readonly PartnerKycDocumentType[];
  missing: readonly PartnerKycDocumentType[];
  required: readonly PartnerKycDocumentType[];
  verified: readonly PartnerKycDocumentType[];
};

export function summarizePersistedPartnerKyc(input: {
  documents: readonly {
    documentType: string;
    expiresOn: string | null;
    status: string;
  }[];
  partnerType: PartnerKycPartnerType;
  today: string;
}): PersistedPartnerKycSummary {
  const required = requiredPartnerKycDocuments(input.partnerType);
  const byType = new Map(input.documents.map((document) => [document.documentType, document]));
  const verified: PartnerKycDocumentType[] = [];
  const expired: PartnerKycDocumentType[] = [];
  const missing: PartnerKycDocumentType[] = [];

  for (const documentType of required) {
    const document = byType.get(documentType);
    if (!document) {
      missing.push(documentType);
      continue;
    }
    const status = effectivePartnerKycStatus({
      expiresOn: document.expiresOn,
      status: document.status as PartnerKycDocumentStatus,
      today: input.today,
    });
    if (status === 'VERIFIED') verified.push(documentType);
    else if (status === 'EXPIRED') expired.push(documentType);
    else missing.push(documentType);
  }

  return {
    complete: verified.length === required.length,
    expired,
    missing,
    required,
    verified,
  };
}

export function partnerKycStorageReadiness(environment: {
  allowedHosts?: string;
  callbackSecret?: string;
  signingApiKey?: string;
  signingEndpoint?: string;
}):
  | { code: 'KYC_STORAGE_NOT_CONFIGURED'; ready: false }
  | { code: 'KYC_STORAGE_READY'; ready: true } {
  const allowedHosts =
    environment.allowedHosts
      ?.split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean) ?? [];
  let endpointAllowed = false;
  try {
    const endpoint = new URL(environment.signingEndpoint ?? '');
    const hostname = endpoint.hostname.toLowerCase();
    endpointAllowed =
      endpoint.protocol === 'https:' &&
      !endpoint.username &&
      !endpoint.password &&
      allowedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    endpointAllowed = false;
  }
  const ready =
    typeof environment.callbackSecret === 'string' &&
    environment.callbackSecret.trim().length >= 32 &&
    typeof environment.signingApiKey === 'string' &&
    environment.signingApiKey.trim().length >= 16 &&
    endpointAllowed;
  return ready
    ? { code: 'KYC_STORAGE_READY', ready: true }
    : { code: 'KYC_STORAGE_NOT_CONFIGURED', ready: false };
}

export function publicPartnerKycProjection(document: {
  documentType: string;
  expiresOn: string | null;
  fileVersion: number;
  issuedOn: string | null;
  lockVersion: number;
  reviewNote: string | null;
  status: string;
  versions: readonly {
    byteSize: number;
    contentType: string;
    originalFilename: string;
    storageStatus: string;
  }[];
}) {
  const version = document.versions[0] ?? null;
  return {
    byteSize: version?.byteSize ?? null,
    contentType: version?.contentType ?? null,
    documentType: document.documentType,
    expiresOn: document.expiresOn,
    fileVersion: document.fileVersion,
    issuedOn: document.issuedOn,
    lockVersion: document.lockVersion,
    originalFilename: version?.originalFilename ?? null,
    reviewNote: document.reviewNote,
    status: document.status,
    storageStatus: version?.storageStatus ?? null,
  };
}
