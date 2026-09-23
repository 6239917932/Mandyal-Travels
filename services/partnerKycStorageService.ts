import 'server-only';

import {
  isAllowedProviderEndpoint,
  parseAllowedProviderHosts,
} from '@/lib/integrations/providerEndpoint';
import type { PartnerKycDocumentMetadata } from '@/lib/partner/kycDocumentRules';
import { partnerKycStorageReadiness } from '@/lib/partner/kycPersistenceRules';

type UploadIntent = {
  expiresAt: string;
  headers: Record<string, string>;
  method: 'PUT';
  uploadUrl: string;
};
const MAX_INTENT_LIFETIME_MS = 10 * 60_000;
const HEADER_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,100}$/;

export function kycStorageEnvironment() {
  return {
    allowedHosts: process.env.KYC_DOCUMENT_PROVIDER_ALLOWED_HOSTS,
    callbackSecret: process.env.KYC_DOCUMENT_SCAN_CALLBACK_SECRET,
    signingApiKey: process.env.KYC_DOCUMENT_SIGNING_API_KEY,
    signingEndpoint: process.env.KYC_DOCUMENT_SIGNING_ENDPOINT,
  };
}

function parseHeaders(value: unknown): Record<string, string> | null {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.length > 20) return null;
  const headers: Record<string, string> = {};
  for (const [name, headerValue] of entries) {
    if (
      !HEADER_NAME_PATTERN.test(name) ||
      typeof headerValue !== 'string' ||
      headerValue.length > 2_048 ||
      /[\r\n]/.test(headerValue)
    )
      return null;
    headers[name] = headerValue;
  }
  return headers;
}

export async function requestPartnerKycUploadIntent(input: {
  metadata: PartnerKycDocumentMetadata;
  objectKey: string;
}): Promise<UploadIntent> {
  const environment = kycStorageEnvironment();
  if (!partnerKycStorageReadiness(environment).ready) throw new Error('KYC_STORAGE_NOT_CONFIGURED');
  const allowedHosts = parseAllowedProviderHosts(environment.allowedHosts);
  if (
    !environment.signingEndpoint ||
    !isAllowedProviderEndpoint(environment.signingEndpoint, allowedHosts)
  )
    throw new Error('KYC_STORAGE_NOT_CONFIGURED');
  const response = await fetch(environment.signingEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${environment.signingApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      byteSize: input.metadata.byteSize,
      contentType: input.metadata.contentType,
      objectKey: input.objectKey,
      requiredControls: ['content-sniff', 'malware-scan', 'no-public-read', 'sha256-match'],
      sha256: input.metadata.sha256,
      visibility: 'PRIVATE',
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error('KYC_STORAGE_PROVIDER_UNAVAILABLE');
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object') throw new Error('KYC_STORAGE_INVALID_RESPONSE');
  const candidate = payload as Partial<UploadIntent>;
  const expiresAt =
    typeof candidate.expiresAt === 'string' ? new Date(candidate.expiresAt) : new Date(NaN);
  const headers = parseHeaders(candidate.headers);
  const now = Date.now();
  if (
    candidate.method !== 'PUT' ||
    typeof candidate.uploadUrl !== 'string' ||
    !isAllowedProviderEndpoint(candidate.uploadUrl, allowedHosts) ||
    headers === null ||
    !Number.isFinite(expiresAt.getTime()) ||
    expiresAt.getTime() <= now ||
    expiresAt.getTime() > now + MAX_INTENT_LIFETIME_MS
  )
    throw new Error('KYC_STORAGE_INVALID_RESPONSE');
  return {
    expiresAt: expiresAt.toISOString(),
    headers,
    method: 'PUT',
    uploadUrl: candidate.uploadUrl,
  };
}
