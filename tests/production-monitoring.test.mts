import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('production monitor is scheduled, bounded, least-privilege, and manually runnable', async () => {
  const workflow = await read('.github/workflows/production-monitor.yml');
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /cron: '17,47 \* \* \* \*'/);
  assert.match(workflow, /permissions:\s+contents: read/);
  assert.match(workflow, /timeout-minutes: 5/);
  assert.match(workflow, /MONITOR_REQUESTS: 6/);
  assert.match(workflow, /MONITOR_MAX_P95_MS: 2000/);
  assert.doesNotMatch(
    workflow,
    /secrets\.|permissions:\s+write|pull-requests: write|issues: write/,
  );
});

test('production monitor validates readiness and headers without commerce mutations', async () => {
  const monitor = await read('scripts/monitor-production.mjs');
  assert.match(monitor, /https:\/\/www\.mandyaltravels\.com/);
  assert.match(monitor, /\/api\/v1\/health\/live/);
  assert.match(monitor, /\/api\/v1\/health/);
  assert.match(monitor, /content-security-policy/);
  assert.match(monitor, /strict-transport-security/);
  assert.match(monitor, /maximumP95Ms/);
  assert.doesNotMatch(monitor, /method:\s*['"](?:POST|PUT|PATCH|DELETE)/);
});
