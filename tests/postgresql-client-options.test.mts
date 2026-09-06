import assert from 'node:assert/strict';
import test from 'node:test';

import { postgreSqlClientOptions } from '../scripts/lib/postgresql-client-options.mjs';

test('PostgreSQL verification preserves verified TLS for public database hosts', () => {
  const databaseUrl = 'postgresql://app:secret@db.vendor.test/mandyal?sslmode=verify-full';

  assert.deepEqual(postgreSqlClientOptions(databaseUrl), { connectionString: databaseUrl });
});

test('PostgreSQL verification scopes Railway private certificate handling to internal DNS', () => {
  const options = postgreSqlClientOptions(
    'postgresql://app:secret@postgres.railway.internal/railway?sslmode=require',
  );

  assert.equal(
    options.connectionString,
    'postgresql://app:secret@postgres.railway.internal/railway',
  );
  assert.deepEqual(options.ssl, { rejectUnauthorized: false });
});
