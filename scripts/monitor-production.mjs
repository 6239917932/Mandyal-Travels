import process from 'node:process';

const expectedOrigin = new URL(
  process.env.MONITOR_BASE_URL?.trim() || 'https://www.mandyaltravels.com',
);
const requestCount = boundedInteger(process.env.MONITOR_REQUESTS, 6, 3, 20);
const maximumP95Ms = boundedInteger(process.env.MONITOR_MAX_P95_MS, 2_000, 250, 10_000);
const timeoutMs = boundedInteger(process.env.MONITOR_TIMEOUT_MS, 10_000, 1_000, 30_000);
const failures = [];
const durations = [];

if (expectedOrigin.protocol !== 'https:' || expectedOrigin.pathname !== '/') {
  throw new Error('MONITOR_BASE_URL must be an HTTPS origin without a path.');
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isSafeInteger(parsed) ? Math.max(minimum, Math.min(maximum, parsed)) : fallback;
}

async function request(pathname) {
  const startedAt = performance.now();
  const response = await fetch(new URL(pathname, expectedOrigin), {
    cache: 'no-store',
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.text();
  durations.push(performance.now() - startedAt);
  if (response.status !== 200) failures.push(`${pathname} returned HTTP ${response.status}`);
  return { body, headers: response.headers, response };
}

function requireSecurityHeaders(headers) {
  const required = [
    ['content-security-policy', /frame-ancestors 'none'/],
    ['strict-transport-security', /max-age=/],
    ['x-content-type-options', /^nosniff$/],
    ['x-frame-options', /^DENY$/],
  ];
  for (const [name, expected] of required) {
    const value = headers.get(name) ?? '';
    if (!expected.test(value)) failures.push(`security header ${name} is missing or invalid`);
  }
}

try {
  const home = await request('/');
  if (home.response.url !== expectedOrigin.href) {
    failures.push(`canonical home resolved to ${new URL(home.response.url).origin}`);
  }
  if (!home.body.includes('Mandyal Travels')) failures.push('home page branding is unavailable');

  const readiness = await request('/api/v1/health');
  requireSecurityHeaders(readiness.headers);
  let readinessData;
  try {
    readinessData = JSON.parse(readiness.body)?.data;
  } catch {
    failures.push('readiness endpoint did not return JSON');
  }
  for (const field of ['status', 'database', 'dependencies', 'schema']) {
    if (readinessData?.[field] !== 'ready') failures.push(`readiness ${field} is not ready`);
  }

  for (let index = 0; index < requestCount; index += 1) {
    const liveness = await request('/api/v1/health/live');
    if (!liveness.body.includes('"status":"alive"')) failures.push('liveness is not alive');
  }
} catch (error) {
  failures.push(error instanceof Error ? error.message : 'production monitor failed unexpectedly');
}

const ordered = [...durations].sort((left, right) => left - right);
const p95Ms = ordered[Math.max(0, Math.ceil(ordered.length * 0.95) - 1)] ?? 0;
if (p95Ms > maximumP95Ms) failures.push(`p95 ${Math.round(p95Ms)}ms exceeds ${maximumP95Ms}ms`);

console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      failureCount: failures.length,
      origin: expectedOrigin.origin,
      p95Ms: Math.round(p95Ms),
      requests: durations.length,
    },
    null,
    2,
  ),
);

if (failures.length) {
  console.error(`Production synthetic monitor failed:\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log('Production synthetic monitor passed.');
}
