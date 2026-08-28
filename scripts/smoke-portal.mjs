import process from 'node:process';

import { fetchRuntimePath, roundMilliseconds, runtimeBaseUrl } from './lib/runtime-http.mjs';

const routeContracts = [
  { content: 'Mandyal Travels', path: '/', type: 'text/html' },
  { content: 'Hotels', path: '/hotels', type: 'text/html' },
  { content: 'Flights', path: '/flights', type: 'text/html' },
  { content: 'Buses', path: '/buses', type: 'text/html' },
  { content: 'Cars', path: '/cars', type: 'text/html' },
  { content: 'Offers', path: '/offers', type: 'text/html' },
  { content: 'Business', path: '/business', type: 'text/html' },
  { content: 'Partners', path: '/partners', type: 'text/html' },
  { content: 'Travel questions deserve a human answer.', path: '/contact', type: 'text/html' },
  { content: '"status":"alive"', path: '/api/v1/health/live', type: 'application/json' },
];

const failures = [];
const results = [];

for (const contract of routeContracts) {
  try {
    const result = await fetchRuntimePath(contract.path);
    const routeFailures = [];
    if (result.status < 200 || result.status >= 400)
      routeFailures.push(`returned HTTP ${result.status}`);
    if (!result.contentType.toLowerCase().includes(contract.type))
      routeFailures.push(`returned ${result.contentType || 'no content type'}`);
    if (!result.body.toLowerCase().includes(contract.content.toLowerCase()))
      routeFailures.push(`did not include expected content: ${contract.content}`);
    if (/internal server error|application error/i.test(result.body))
      routeFailures.push('rendered an application error');

    failures.push(...routeFailures.map((message) => `${contract.path} ${message}`));
    results.push({
      durationMs: roundMilliseconds(result.durationMs),
      path: contract.path,
      status: result.status,
    });
  } catch (error) {
    failures.push(
      `${contract.path} failed: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
  }
}

console.log(
  JSON.stringify(
    { baseUrl: runtimeBaseUrl.href, checkedRoutes: results, failureCount: failures.length },
    null,
    2,
  ),
);

if (failures.length) {
  console.error(`Portal smoke test failed:\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log('Portal smoke test passed.');
}
