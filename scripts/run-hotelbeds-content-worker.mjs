import 'dotenv/config';

import { randomUUID } from 'node:crypto';

function workerUrl() {
  const origin = (process.env.PUBLIC_APP_ORIGIN ?? '').trim();
  if (!origin) throw new Error('PUBLIC_APP_ORIGIN is required.');
  const url = new URL('/api/v1/internal/workers/hotelbeds-content', origin);
  if (
    url.protocol !== 'https:' &&
    !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname))
  ) {
    throw new Error('PUBLIC_APP_ORIGIN must use HTTPS outside local development.');
  }
  return url;
}

async function main() {
  const secret = (process.env.AUTOPILOT_WORKER_SECRET ?? '').trim();
  if (secret.length < 32) throw new Error('AUTOPILOT_WORKER_SECRET must contain 32 characters.');
  if (process.env.HOTELBEDS_CONTENT_SYNC_ENABLED !== 'true') {
    throw new Error('HOTELBEDS_CONTENT_SYNC_ENABLED must be explicitly true.');
  }
  const correlationId = randomUUID();
  const response = await fetch(workerUrl(), {
    body: JSON.stringify({ correlationId }),
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
      'x-correlation-id': correlationId,
    },
    method: 'POST',
    signal: AbortSignal.timeout(300_000),
  });
  if (!response.ok) {
    throw new Error(`Hotelbeds content worker returned HTTP ${response.status}.`);
  }
  process.stdout.write(`Hotelbeds content sync completed: ${await response.text()}\n`);
}

main().catch((error) => {
  process.stderr.write(
    `Hotelbeds content sync failed: ${error instanceof Error ? error.message : 'Unknown failure.'}\n`,
  );
  process.exitCode = 1;
});
