import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('production process contract gates web startup and keeps jobs one shot', () => {
  const compose = read('compose.production-contract.yaml');

  assert.match(compose, /command: \['npm', 'run', 'db:deploy:postgresql'\]/);
  assert.match(compose, /condition: service_completed_successfully/);
  assert.match(compose, /notification-delivery:[\s\S]*profiles: \['scheduled-jobs'\]/);
  assert.match(compose, /notification-delivery:[\s\S]*target: worker/);
  assert.match(compose, /notification-delivery:[\s\S]*restart: 'no'/);
  assert.doesNotMatch(compose, /DATABASE_URL:\s*file:/);
});

test('production workloads are hardened and receive secrets only by reference', () => {
  const compose = read('compose.production-contract.yaml');

  assert.equal((compose.match(/cap_drop:/g) ?? []).length, 3);
  assert.equal((compose.match(/read_only: true/g) ?? []).length, 3);
  assert.equal((compose.match(/no-new-privileges:true/g) ?? []).length, 3);
  assert.match(compose, /DATABASE_URL: \$\{DATABASE_URL:\?/);
  assert.match(compose, /DIRECT_DATABASE_URL: \$\{DIRECT_DATABASE_URL:\?/);
  assert.match(compose, /RELEASE_SHA: \$\{RELEASE_SHA:\?/);
  assert.doesNotMatch(compose, /(?:gho_|sk_live_|-----BEGIN [A-Z ]+PRIVATE KEY-----)/i);
});

test('web image fails closed when no database URL is injected', () => {
  const dockerfile = read('Dockerfile');

  assert.doesNotMatch(dockerfile, /ENV\s+DATABASE_URL\s*=\s*file:/i);
  assert.match(dockerfile, /FROM operations AS worker/);
  assert.match(dockerfile, /CMD \["npm", "run", "worker:notifications"\]/);
});
