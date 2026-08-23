import 'dotenv/config';

const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_TIMEOUT_MS = 30_000;
const MINIMUM_SECRET_LENGTH = 32;

function boundedInteger(value, fallback, minimum, maximum, name) {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}.`);
  }
  return parsed;
}

function workerUrl() {
  const origin = (process.env.PUBLIC_APP_ORIGIN ?? '').trim();
  if (!origin) throw new Error('PUBLIC_APP_ORIGIN is required.');

  const url = new URL('/api/v1/internal/workers/notifications', origin);
  const localHostnames = new Set(['localhost', '127.0.0.1', '::1']);
  if (
    url.protocol !== 'https:' &&
    !(url.protocol === 'http:' && localHostnames.has(url.hostname))
  ) {
    throw new Error('PUBLIC_APP_ORIGIN must use HTTPS outside local development.');
  }
  return url;
}

async function main() {
  const secret = (process.env.NOTIFICATION_WORKER_SECRET ?? '').trim();
  if (secret.length < MINIMUM_SECRET_LENGTH) {
    throw new Error(
      `NOTIFICATION_WORKER_SECRET must contain at least ${MINIMUM_SECRET_LENGTH} characters.`,
    );
  }

  const batchSize = boundedInteger(
    process.env.NOTIFICATION_WORKER_BATCH_SIZE,
    DEFAULT_BATCH_SIZE,
    1,
    100,
    'NOTIFICATION_WORKER_BATCH_SIZE',
  );
  const timeoutMs = boundedInteger(
    process.env.NOTIFICATION_WORKER_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS,
    1_000,
    120_000,
    'NOTIFICATION_WORKER_TIMEOUT_MS',
  );

  const response = await fetch(workerUrl(), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ batchSize }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Notification worker returned HTTP ${response.status}.`);
  }

  let summary;
  try {
    summary = JSON.parse(body);
  } catch {
    throw new Error('Notification worker returned an invalid response.');
  }
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
    throw new Error('Notification worker returned an invalid summary.');
  }

  const safeSummary = Object.fromEntries(
    Object.entries(summary).filter(
      ([, value]) => typeof value === 'number' && Number.isFinite(value),
    ),
  );
  process.stdout.write(`Notification delivery completed: ${JSON.stringify(safeSummary)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown notification worker failure.';
  process.stderr.write(`Notification delivery failed: ${message}\n`);
  process.exitCode = 1;
});
