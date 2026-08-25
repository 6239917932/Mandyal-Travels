import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveDatabasePoolConfiguration,
  resolveDatabaseRuntimeProvider,
  validatePostgreSqlRuntimeUrl,
} from '../lib/database/runtime.ts';

test('database runtime selects only the supported SQLite and PostgreSQL providers', () => {
  assert.equal(resolveDatabaseRuntimeProvider('file:./prisma/dev.db'), 'sqlite');
  assert.equal(resolveDatabaseRuntimeProvider('postgresql://app@db.example/mandyal'), 'postgresql');
  assert.equal(resolveDatabaseRuntimeProvider('postgres://app@db.example/mandyal'), 'postgresql');
  assert.throws(() => resolveDatabaseRuntimeProvider('mysql://app@db.example/mandyal'));
});

test('production PostgreSQL URLs require a complete TLS connection contract', () => {
  assert.equal(
    validatePostgreSqlRuntimeUrl('postgresql://app@db.example/mandyal?sslmode=verify-full', true)
      .hostname,
    'db.example',
  );
  assert.throws(
    () => validatePostgreSqlRuntimeUrl('postgresql://app@db.example/mandyal', true),
    /DATABASE_URL_TLS_REQUIRED/,
  );
  assert.throws(
    () => validatePostgreSqlRuntimeUrl('postgresql://db.example', false),
    /DATABASE_URL_INCOMPLETE/,
  );
});

test('database pool controls use bounded deterministic values', () => {
  assert.deepEqual(resolveDatabasePoolConfiguration({}), {
    connectionTimeoutMillis: 10_000,
    max: 10,
    statementTimeoutMillis: 30_000,
  });
  assert.deepEqual(
    resolveDatabasePoolConfiguration({
      DATABASE_CONNECT_TIMEOUT_MS: '5000',
      DATABASE_POOL_MAX: '20',
      DATABASE_STATEMENT_TIMEOUT_MS: '60000',
    }),
    { connectionTimeoutMillis: 5_000, max: 20, statementTimeoutMillis: 60_000 },
  );
  assert.throws(() => resolveDatabasePoolConfiguration({ DATABASE_POOL_MAX: '0' }));
  assert.throws(() => resolveDatabasePoolConfiguration({ DATABASE_POOL_MAX: 'not-a-number' }));
});
