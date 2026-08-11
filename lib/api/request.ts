export const DEFAULT_JSON_BODY_LIMIT_BYTES = 64 * 1024;

async function readLimitedBody(request: Request, maximumBytes: number) {
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder('utf-8', { fatal: true }).decode(body);
}

export async function readJsonObject(
  request: Request,
  maximumBytes = DEFAULT_JSON_BODY_LIMIT_BYTES,
) {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) return null;

  const declaredLength = request.headers.get('content-length');
  if (declaredLength) {
    if (!/^\d+$/.test(declaredLength) || Number(declaredLength) > maximumBytes) return null;
  }

  try {
    const text = await readLimitedBody(request, maximumBytes);
    if (text === null) return null;

    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}
