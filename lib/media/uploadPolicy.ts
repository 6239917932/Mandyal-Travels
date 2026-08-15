export const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
export type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];
export const MAX_MEDIA_BYTES = 12 * 1024 * 1024;

export function validateMediaUpload(input: {
  contentType: string;
  byteLength: number;
  fileName: string;
}) {
  const contentType = input.contentType.toLowerCase();
  const extension = input.fileName.toLowerCase().split('.').pop() ?? '';
  const validExtension = ['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(extension);
  if (!ALLOWED_MEDIA_TYPES.some((item) => item === contentType) || !validExtension) {
    throw new Error('Only JPEG, PNG, WebP, and AVIF property images are supported.');
  }
  if (
    !Number.isSafeInteger(input.byteLength) ||
    input.byteLength < 1 ||
    input.byteLength > MAX_MEDIA_BYTES
  ) {
    throw new Error('Property images must not exceed 12 MB.');
  }
  return { contentType: contentType as AllowedMediaType, extension };
}
