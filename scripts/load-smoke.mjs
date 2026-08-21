import process from 'node:process';

import {
  boundedInteger,
  fetchRuntimePath,
  percentile,
  roundMilliseconds,
  runtimeBaseUrl,
} from './lib/runtime-http.mjs';

const requestCount = boundedInteger(process.env.LOAD_REQUESTS, 40, 1, 2_000);
const concurrency = boundedInteger(process.env.LOAD_CONCURRENCY, 5, 1, 100);
const maximumP95Ms = boundedInteger(process.env.LOAD_MAX_P95_MS, 2_000, 50, 60_000);
const pathname = process.env.LOAD_PATH ?? '/api/v1/health/live';
const durations = [];
const errors = [];
let cursor = 0;

async function worker() {
  while (true) {
    const requestIndex = cursor++;
    if (requestIndex >= requestCount) return;
    try {
      const result = await fetchRuntimePath(pathname);
      durations.push(result.durationMs);
      if (result.status < 200 || result.status >= 300)
        errors.push(`request ${requestIndex + 1} returned HTTP ${result.status}`);
    } catch (error) {
      errors.push(
        `request ${requestIndex + 1} failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}

const startedAt = performance.now();
await Promise.all(Array.from({ length: Math.min(concurrency, requestCount) }, () => worker()));
const p95Ms = percentile(durations, 0.95);
const report = {
  averageMs: roundMilliseconds(
    durations.length
      ? durations.reduce((total, duration) => total + duration, 0) / durations.length
      : 0,
  ),
  baseUrl: runtimeBaseUrl.href,
  concurrency,
  durationMs: roundMilliseconds(performance.now() - startedAt),
  errorCount: errors.length,
  p95Ms: roundMilliseconds(p95Ms),
  path: pathname,
  requestCount,
};

console.log(JSON.stringify(report, null, 2));
if (errors.length || p95Ms > maximumP95Ms) {
  if (errors.length) console.error(`Load smoke failures:\n- ${errors.slice(0, 10).join('\n- ')}`);
  if (p95Ms > maximumP95Ms)
    console.error(`Load smoke p95 ${roundMilliseconds(p95Ms)}ms exceeded ${maximumP95Ms}ms.`);
  process.exitCode = 1;
} else {
  console.log('Bounded load smoke test passed.');
}
