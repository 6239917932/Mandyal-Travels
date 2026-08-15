import { validateMediaUpload } from '@/lib/media/uploadPolicy';

type UploadIntentResponse = {
  uploadUrl: string;
  publicUrl: string;
  expiresAt: string;
  headers?: Record<string, string>;
};

export async function createMediaUploadIntent(input: {
  partnerId: string;
  fileName: string;
  contentType: string;
  byteLength: number;
}): Promise<UploadIntentResponse> {
  const media = validateMediaUpload(input);
  const endpoint = process.env.MEDIA_SIGNING_ENDPOINT;
  const apiKey = process.env.MEDIA_SIGNING_API_KEY;
  if (!endpoint || !apiKey) throw new Error('MEDIA_PROVIDER_NOT_CONFIGURED');

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
  if (!candidate.uploadUrl || !candidate.publicUrl || !candidate.expiresAt) {
    throw new Error('MEDIA_PROVIDER_INVALID_RESPONSE');
  }
  return {
    uploadUrl: candidate.uploadUrl,
    publicUrl: candidate.publicUrl,
    expiresAt: candidate.expiresAt,
    headers: candidate.headers ?? {},
  };
}
