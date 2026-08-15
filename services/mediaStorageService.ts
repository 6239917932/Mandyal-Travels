import 'server-only';

import {
  isAllowedProviderEndpoint,
  parseAllowedProviderHosts,
} from '@/lib/integrations/providerEndpoint';
import { validateMediaUpload } from '@/lib/media/uploadPolicy';

type UploadIntentResponse = {
  uploadUrl: string;
  publicUrl: string;
  expiresAt: string;
  headers?: Record<string, string>;
};

const MAX_UPLOAD_INTENT_LIFETIME_MS = 15 * 60 * 1_000;
const HEADER_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,100}$/;

function parseProviderHeaders(value: unknown): Record<string, string> | null {
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

export async function createMediaUploadIntent(input: {
  partnerId: string;
  fileName: string;
  contentType: string;
  byteLength: number;
}): Promise<UploadIntentResponse> {
  const media = validateMediaUpload(input);
  const endpoint = process.env.MEDIA_SIGNING_ENDPOINT;
  const apiKey = process.env.MEDIA_SIGNING_API_KEY;
  const allowedHosts = parseAllowedProviderHosts(process.env.MEDIA_PROVIDER_ALLOWED_HOSTS);
  if (!endpoint || !apiKey || !isAllowedProviderEndpoint(endpoint, allowedHosts))
    throw new Error('MEDIA_PROVIDER_NOT_CONFIGURED');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      namespace: `partners/${input.partnerId}`,
      fileName: input.fileName,
      contentType: media.contentType,
      byteLength: input.byteLength,
      visibility: 'PUBLIC_READ_AFTER_SCAN',
      requiredControls: ['virus-scan', 'image-decode', 'metadata-strip'],
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error('MEDIA_PROVIDER_UNAVAILABLE');
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object') throw new Error('MEDIA_PROVIDER_INVALID_RESPONSE');
  const candidate = payload as Partial<UploadIntentResponse>;
  const expiresAt =
    typeof candidate.expiresAt === 'string' ? new Date(candidate.expiresAt) : new Date(NaN);
  const now = Date.now();
  const headers = parseProviderHeaders(candidate.headers);
  if (
    typeof candidate.uploadUrl !== 'string' ||
    typeof candidate.publicUrl !== 'string' ||
    !isAllowedProviderEndpoint(candidate.uploadUrl, allowedHosts) ||
    !isAllowedProviderEndpoint(candidate.publicUrl, allowedHosts) ||
    !Number.isFinite(expiresAt.getTime()) ||
    expiresAt.getTime() <= now ||
    expiresAt.getTime() > now + MAX_UPLOAD_INTENT_LIFETIME_MS ||
    headers === null
  ) {
    throw new Error('MEDIA_PROVIDER_INVALID_RESPONSE');
  }
  return {
    uploadUrl: candidate.uploadUrl,
    publicUrl: candidate.publicUrl,
    expiresAt: expiresAt.toISOString(),
    headers,
  };
}
