import assert from 'node:assert/strict';
import test from 'node:test';
import { correlationIdFromHeader } from '../lib/api/correlation.ts';

test('correlation IDs preserve valid caller identifiers', () => {
  assert.equal(correlationIdFromHeader(' booking:2026-0001 '), 'booking:2026-0001');
});

test('correlation IDs replace malformed or unsafe values', () => {
  assert.match(correlationIdFromHeader('bad\nheader'), /^[0-9a-f-]{36}$/);
  assert.match(correlationIdFromHeader(null), /^[0-9a-f-]{36}$/);
});
