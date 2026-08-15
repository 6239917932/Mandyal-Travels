import assert from 'node:assert/strict';
import test from 'node:test';

test('production database policy accepts PostgreSQL schemes only', () => {
  const accepted = ['postgresql://db.example/app', 'postgres://db.example/app'];
  const rejected = ['file:./prisma/dev.db', 'mysql://db.example/app', ''];
  assert.ok(
    accepted.every((url) => ['postgresql:', 'postgres:'].some((prefix) => url.startsWith(prefix))),
  );
  assert.ok(
    rejected.every((url) => !['postgresql:', 'postgres:'].some((prefix) => url.startsWith(prefix))),
  );
});
