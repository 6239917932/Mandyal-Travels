import process from 'node:process';

import { boundedInteger, fetchRuntimePath, runtimeBaseUrl } from './lib/runtime-http.mjs';

const maximumWaitMs = boundedInteger(
  process.env.RUNTIME_STARTUP_TIMEOUT_MS,
  60_000,
  1_000,
  180_000,
);
const startedAt = Date.now();
let lastFailure = 'No response received.';

while (Date.now() - startedAt < maximumWaitMs) {
  try {
    const result = await fetchRuntimePath('/api/v1/health/live', { timeoutMs: 2_000 });
    if (result.status === 200 && result.body.includes('"status":"alive"')) {
      console.log(`Portal runtime is ready at ${runtimeBaseUrl.href}`);
      process.exit(0);
    }
    lastFailure = `HTTP ${result.status}`;
  } catch (error) {
    lastFailure = error instanceof Error ? error.message : 'unknown error';
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}

throw new Error(`Portal did not become ready within ${maximumWaitMs}ms: ${lastFailure}`);
