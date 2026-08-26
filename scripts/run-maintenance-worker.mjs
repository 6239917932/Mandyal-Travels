import 'dotenv/config';

import crypto from 'node:crypto';

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
  const url = new URL('/api/v1/internal/workers/maintenance', origin);
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
  const secret = (process.env.AUTOPILOT_WORKER_SECRET ?? '').trim();
  if (secret.length < MINIMUM_SECRET_LENGTH) {
    throw new Error(
      `AUTOPILOT_WORKER_SECRET must contain at least ${MINIMUM_SECRET_LENGTH} characters.`,
    );
  }
  const batchSize = boundedInteger(
    process.env.AUTOPILOT_WORKER_BATCH_SIZE,
    25,
    1,
    100,
    'AUTOPILOT_WORKER_BATCH_SIZE',
  );
  const timeoutMs = boundedInteger(
    process.env.AUTOPILOT_WORKER_TIMEOUT_MS,
    30_000,
    1_000,
    120_000,
    'AUTOPILOT_WORKER_TIMEOUT_MS',
  );
  const correlationId = crypto.randomUUID();
  const response = await fetch(workerUrl(), {
    body: JSON.stringify({ batchSize, correlationId }),
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
      'x-correlation-id': correlationId,
    },
    method: 'POST',
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Maintenance worker returned HTTP ${response.status}.`);
  const summary = JSON.parse(body);
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
    throw new Error('Maintenance worker returned an invalid summary.');
  }
  process.stdout.write(`Safe maintenance completed: ${JSON.stringify(summary)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown maintenance worker failure.';
  process.stderr.write(`Safe maintenance failed: ${message}\n`);
  process.exitCode = 1;
});
