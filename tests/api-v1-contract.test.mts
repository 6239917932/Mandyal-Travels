import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { API_V1_CONTRACT, API_V1_SUPPORTED_OPERATIONS } from '../config/apiV1Contract.ts';
import { hasSameGeneratedContent } from '../scripts/generated-contract-text.mjs';

test('generated contract verification normalizes line endings without hiding API drift', () => {
  const expected = '{\n  "openapi": "3.1.0"\n}\n';
  const windowsCheckout = expected.replace(/\n/g, '\r\n');
  const changedContract = '{\r\n  "openapi": "3.0.0"\r\n}\r\n';

  assert.equal(hasSameGeneratedContent(windowsCheckout, expected), true);
  assert.equal(hasSameGeneratedContent(changedContract, expected), false);
});

test('catalogue is explicitly partial, local, closed, and duplicate safe', () => {
  assert.equal(API_V1_CONTRACT.apiVersion, 'v1');
  assert.equal(API_V1_CONTRACT.coverage, 'CURATED_SUPPORTED_LOCAL_SUBSET');
  assert.equal(API_V1_SUPPORTED_OPERATIONS.length, 12);

  const keys = API_V1_SUPPORTED_OPERATIONS.map(({ method, path }) => `${method} ${path}`);
  const ids = API_V1_SUPPORTED_OPERATIONS.map(({ operationId }) => operationId);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(API_V1_SUPPORTED_OPERATIONS.every(({ path }) => path.startsWith('/api/v1/')));
  assert.ok(
    API_V1_SUPPORTED_OPERATIONS.every(({ fulfillment }) => fulfillment === 'LOCAL_PORTAL_ONLY'),
  );
  assert.ok(
    API_V1_SUPPORTED_OPERATIONS.every(({ path }) =>
      ['/api/v1/internal', '/api/v1/payments', '/api/v1/webhooks'].every(
        (rootPath) => path !== rootPath && !path.startsWith(`${rootPath}/`),
      ),
    ),
  );
});

test('every operation declares auth, pagination, errors, and idempotency honestly', () => {
  for (const operation of API_V1_SUPPORTED_OPERATIONS) {
    assert.ok(operation.auth.length > 0);
    assert.ok(operation.errorEnvelope.length > 0);
    assert.ok(operation.successStatuses.every((status) => status >= 200 && status <= 299));
    assert.ok(operation.pagination.mode === 'NONE' || operation.method === 'GET');
    if (operation.idempotency.mode === 'REQUIRED') {
      assert.equal(operation.method, 'POST');
      assert.equal(operation.idempotency.header, 'Idempotency-Key');
    }
    if (operation.method === 'GET') assert.equal(operation.idempotency.mode, 'NOT_APPLICABLE');
  }

  const travelRequest = API_V1_SUPPORTED_OPERATIONS.find(
    ({ operationId }) => operationId === 'createAgencyTravelRequest',
  );
  assert.deepEqual(travelRequest?.successStatuses, [200, 201]);
});

test('catalogue and generated description contain no provider evidence fields', () => {
  const serialized = JSON.stringify(API_V1_CONTRACT);
  assert.doesNotMatch(
    serialized,
    /providerRef|secretRef|credentialValue|webhookSignature|cashfree/i,
  );
});

test('meta route and package gate use the single typed catalogue', async () => {
  const [metaRoute, packageJson, openApi] = await Promise.all([
    readFile(new URL('../app/api/v1/meta/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../package.json', import.meta.url), 'utf8'),
    readFile(new URL('../docs/openapi-v1.json', import.meta.url), 'utf8'),
  ]);
  assert.match(metaRoute, /API_V1_CONTRACT/);
  assert.match(metaRoute, /supported-local-contracts/);
  assert.match(packageJson, /api:verify-contract/);
  assert.match(packageJson, /api:write-contract/);
  assert.equal(Object.keys(JSON.parse(openApi).paths).length, 11);
});
