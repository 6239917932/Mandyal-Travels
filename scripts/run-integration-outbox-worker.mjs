import 'dotenv/config';

import { randomUUID } from 'node:crypto';

const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_TIMEOUT_MS = 300_000;
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
  const configuredOrigin = new URL(origin);
  if (
    configuredOrigin.username ||
    configuredOrigin.password ||
    configuredOrigin.pathname !== '/' ||
    configuredOrigin.search ||
    configuredOrigin.hash
  ) {
    throw new Error('PUBLIC_APP_ORIGIN must be an origin without path or credentials.');
  }
  const url = new URL('/api/v1/internal/workers/integration-outbox', configuredOrigin);
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
  const secret = (process.env.INTEGRATION_OUTBOX_WORKER_SECRET ?? '').trim();
  if (secret.length < MINIMUM_SECRET_LENGTH) {
    throw new Error(
      `INTEGRATION_OUTBOX_WORKER_SECRET must contain at least ${MINIMUM_SECRET_LENGTH} characters.`,
    );
  }
  const batchSize = boundedInteger(
    process.env.INTEGRATION_OUTBOX_WORKER_BATCH_SIZE,
    DEFAULT_BATCH_SIZE,
    1,
    25,
    'INTEGRATION_OUTBOX_WORKER_BATCH_SIZE',
  );
  const timeoutMs = boundedInteger(
    process.env.INTEGRATION_OUTBOX_WORKER_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS,
    1_000,
    600_000,
    'INTEGRATION_OUTBOX_WORKER_TIMEOUT_MS',
  );
  const configuredCorrelationId = (
    process.env.INTEGRATION_OUTBOX_WORKER_CORRELATION_ID ?? ''
  ).trim();
  if (configuredCorrelationId.length > 120) {
    throw new Error('INTEGRATION_OUTBOX_WORKER_CORRELATION_ID must not exceed 120 characters.');
  }
  const correlationId = configuredCorrelationId || randomUUID();
  const response = await fetch(workerUrl(), {
    body: JSON.stringify({ batchSize, correlationId }),
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
    },
    method: 'POST',
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Integration outbox worker returned HTTP ${response.status}.`);
  }
  let summary;
  try {
    summary = JSON.parse(body);
  } catch {
    throw new Error('Integration outbox worker returned an invalid response.');
  }
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
    throw new Error('Integration outbox worker returned an invalid summary.');
  }
  const safeSummary = Object.fromEntries(
    Object.entries(summary).filter(
      ([key, value]) =>
        ['deadLettered', 'delivered', 'failed', 'processedCount', 'recovered'].includes(key) &&
        typeof value === 'number' &&
        Number.isSafeInteger(value) &&
        value >= 0,
    ),
  );
  process.stdout.write(`Integration outbox delivery completed: ${JSON.stringify(safeSummary)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown integration worker failure.';
  process.stderr.write(`Integration outbox delivery failed: ${message}\n`);
  process.exitCode = 1;
});
