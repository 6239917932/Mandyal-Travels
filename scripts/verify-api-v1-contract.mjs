import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import prettier from 'prettier';

import { API_V1_CONTRACT } from '../config/apiV1Contract.ts';

const root = process.cwd();
const write = process.argv.includes('--write');
const documentPath = path.join(root, 'docs', 'openapi-v1.json');
const methods = new Set(['GET', 'POST']);
const authModes = new Set([
  'CUSTOMER_SESSION',
  'OPTIONAL_SESSION',
  'PUBLIC',
  'TRAVEL_AGENCY_ADMIN',
]);
const errorEnvelopes = new Set(['CODE_MESSAGE', 'HEALTH_STATUS', 'MESSAGE_ONLY', 'NONE']);
const forbiddenPaths = ['/internal/', '/payments/', '/webhooks/'];

function fail(message) {
  console.error(`API v1 contract verification failed: ${message}`);
  process.exit(1);
}

function routeFile(apiPath) {
  const routePath = apiPath
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      const parameter = segment.match(/^\{([A-Za-z][A-Za-z0-9]*)\}$/);
      return parameter ? `[${parameter[1]}]` : segment;
    });
  return path.join(root, 'app', ...routePath, 'route.ts');
}

function security(auth) {
  if (auth === 'PUBLIC') return [];
  if (auth === 'OPTIONAL_SESSION') return [{}, { SessionCookie: [] }];
  return [{ SessionCookie: [] }];
}

function createOpenApiDocument() {
  const paths = {};
  for (const operation of API_V1_CONTRACT.operations) {
    const method = operation.method.toLowerCase();
    paths[operation.path] ??= {};
    paths[operation.path][method] = {
      operationId: operation.operationId,
      responses: {
        [String(operation.successStatus)]: { description: 'Successful local portal response.' },
        default: {
          description:
            operation.errorEnvelope === 'NONE'
              ? 'No operation-specific error envelope is declared.'
              : `Error envelope: ${operation.errorEnvelope}.`,
        },
      },
      security: security(operation.auth),
      summary: operation.summary,
      tags: [operation.tag],
      'x-mandyal-auth': operation.auth,
      'x-mandyal-error-envelope': operation.errorEnvelope,
      'x-mandyal-fulfillment': operation.fulfillment,
      'x-mandyal-idempotency': operation.idempotency,
      'x-mandyal-pagination': operation.pagination,
    };
  }

  return {
    components: {
      securitySchemes: {
        SessionCookie: { in: 'cookie', name: 'mandyal_session', type: 'apiKey' },
      },
    },
    info: {
      description: `${API_V1_CONTRACT.coverageStatement} ${API_V1_CONTRACT.excludedSurface}`,
      title: API_V1_CONTRACT.product,
      version: API_V1_CONTRACT.contractRevision,
      'x-mandyal-api-version': API_V1_CONTRACT.apiVersion,
      'x-mandyal-coverage': API_V1_CONTRACT.coverage,
    },
    openapi: '3.1.0',
    paths,
  };
}

function validate() {
  if (API_V1_CONTRACT.apiVersion !== 'v1' || API_V1_CONTRACT.basePath !== '/api/v1') {
    fail('version and base path must remain explicitly v1.');
  }
  if (API_V1_CONTRACT.coverage !== 'CURATED_SUPPORTED_LOCAL_SUBSET') {
    fail('coverage must remain explicitly partial and local.');
  }

  const keys = new Set();
  const operationIds = new Set();
  for (const operation of API_V1_CONTRACT.operations) {
    const key = `${operation.method} ${operation.path}`;
    if (keys.has(key)) fail(`duplicate operation ${key}.`);
    keys.add(key);
    if (operationIds.has(operation.operationId)) {
      fail(`duplicate operationId ${operation.operationId}.`);
    }
    operationIds.add(operation.operationId);

    if (!methods.has(operation.method)) fail(`${key} uses an unsupported method.`);
    if (!operation.path.startsWith('/api/v1/')) fail(`${key} is outside /api/v1.`);
    if (forbiddenPaths.some((fragment) => operation.path.includes(fragment))) {
      fail(`${key} is a provider/internal surface and cannot be declared here.`);
    }
    if (!authModes.has(operation.auth)) fail(`${key} has invalid auth metadata.`);
    if (!errorEnvelopes.has(operation.errorEnvelope)) fail(`${key} has invalid error metadata.`);
    if (operation.fulfillment !== 'LOCAL_PORTAL_ONLY') {
      fail(`${key} overstates its fulfillment boundary.`);
    }
    if (operation.summary.length < 12 || operation.summary.length > 100) {
      fail(`${key} has an invalid summary.`);
    }
    if (!Number.isInteger(operation.successStatus) || operation.successStatus < 200) {
      fail(`${key} has an invalid success status.`);
    }

    if (operation.pagination.mode === 'FIXED_LIMIT') {
      if (
        operation.method !== 'GET' ||
        !Number.isInteger(operation.pagination.maximumLimit) ||
        operation.pagination.maximumLimit < 1 ||
        operation.pagination.maximumLimit > 100
      ) {
        fail(`${key} has unsafe pagination metadata.`);
      }
    }
    if (operation.idempotency.mode === 'REQUIRED') {
      if (operation.method !== 'POST' || operation.idempotency.header !== 'Idempotency-Key') {
        fail(`${key} has invalid required idempotency metadata.`);
      }
    } else if ((operation.method === 'GET') !== (operation.idempotency.mode === 'NOT_APPLICABLE')) {
      fail(`${key} has inconsistent idempotency metadata.`);
    }

    const sourcePath = routeFile(operation.path);
    if (!fs.existsSync(sourcePath)) fail(`${key} has no route handler.`);
    const source = fs.readFileSync(sourcePath, 'utf8');
    const exportedMethod = new RegExp(
      `export\\s+(?:async\\s+)?(?:function|const)\\s+${operation.method}\\b`,
    );
    if (!exportedMethod.test(source)) fail(`${key} is not exported by its route handler.`);
  }
}

validate();
const serialized = await prettier.format(JSON.stringify(createOpenApiDocument()), {
  filepath: documentPath,
});
if (write) {
  fs.writeFileSync(documentPath, serialized);
} else if (!fs.existsSync(documentPath) || fs.readFileSync(documentPath, 'utf8') !== serialized) {
  fail('docs/openapi-v1.json is stale; run npm run api:write-contract and review the diff.');
}

console.log(
  `Verified ${API_V1_CONTRACT.operations.length} curated supported-local API v1 operations without provider or internal surfaces.`,
);
