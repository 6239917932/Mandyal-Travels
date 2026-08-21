import process from 'node:process';

export const runtimeBaseUrl = new URL(process.env.PORTAL_BASE_URL ?? 'http://127.0.0.1:3000');

export const runtimeTimeoutMs = boundedInteger(
  process.env.RUNTIME_HTTP_TIMEOUT_MS,
  10_000,
  500,
  60_000,
);

export function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isSafeInteger(parsed)) return fallback;
  return Math.max(minimum, Math.min(maximum, parsed));
}

export async function fetchRuntimePath(pathname, options = {}) {
  const startedAt = performance.now();
  const response = await fetch(new URL(pathname, runtimeBaseUrl), {
    cache: 'no-store',
    redirect: 'follow',
    signal: AbortSignal.timeout(options.timeoutMs ?? runtimeTimeoutMs),
  });
  const body = await response.text();

  return {
    body,
    contentType: response.headers.get('content-type') ?? '',
    durationMs: performance.now() - startedAt,
    status: response.status,
    url: response.url,
  };
}

export function percentile(values, ratio) {
  if (!values.length) return 0;
  const ordered = [...values].sort((left, right) => left - right);
  const index = Math.min(ordered.length - 1, Math.ceil(ordered.length * ratio) - 1);
  return ordered[Math.max(0, index)];
}

export function roundMilliseconds(value) {
  return Math.round(value * 100) / 100;
}
