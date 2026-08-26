import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { normalizeDatabaseRecoveryEvidence } from '../lib/automation/recoveryEvidenceRules.ts';

const now = new Date('2026-08-26T12:00:00.000Z');
const validEvidenceWithoutId = {
  baselineSha256: 'a'.repeat(64),
  canonicalTableCount: 93,
  financialMetricCount: 8,
  foreignKeyFailures: 0,
  integrity: 'constraints-validated',
  mismatchCount: 0,
  mode: 'restore',
  verifiedAt: '2026-08-26T11:30:00.000Z',
};
const validEvidence = {
  ...validEvidenceWithoutId,
  evidenceId: createHash('sha256').update(JSON.stringify(validEvidenceWithoutId)).digest('hex'),
};

test('recovery evidence accepts only a recent successful isolated restore summary', () => {
  assert.deepEqual(normalizeDatabaseRecoveryEvidence(validEvidence, now), validEvidence);
  for (const invalid of [
    { ...validEvidence, mode: 'reconcile' },
    { ...validEvidence, mismatchCount: 1 },
    { ...validEvidence, foreignKeyFailures: 1 },
    { ...validEvidence, integrity: 'unchecked' },
    { ...validEvidence, evidenceId: 'B'.repeat(64) },
    { ...validEvidence, canonicalTableCount: 0 },
    { ...validEvidence, verifiedAt: '2026-08-26T10:59:59.999Z' },
    { ...validEvidence, verifiedAt: '2026-08-26T12:05:00.001Z' },
  ]) {
    assert.equal(normalizeDatabaseRecoveryEvidence(invalid, now), null);
  }
});

test('recovery evidence endpoint is authenticated, replay-safe, and stores only governed evidence', () => {
  const route = readFileSync(
    new URL('../app/api/v1/internal/workers/recovery-evidence/route.ts', import.meta.url),
    'utf8',
  );
  const service = readFileSync(
    new URL('../services/databaseRecoveryEvidenceService.ts', import.meta.url),
    'utf8',
  );
  assert.match(route, /AUTOPILOT_WORKER_SECRET/);
  assert.match(route, /timingSafeEqual/);
  assert.match(service, /DATABASE_RESTORE_VERIFICATION_V1/);
  assert.match(service, /restore:\$\{evidence\.evidenceId\}/);
  assert.match(service, /automationJobRun\.findUnique/);
  assert.match(service, /automationJobRun\.create/);
  assert.doesNotMatch(
    `${route}\n${service}`,
    /payment\.(?:create|update)|refund\.(?:create|update)/i,
  );
  assert.doesNotMatch(
    `${route}\n${service}`,
    /booking\.(?:create|update)|inventory\.(?:create|update)/i,
  );
});

test('PostgreSQL rehearsal reports only safe successful restore evidence', () => {
  const script = readFileSync(
    new URL('../scripts/rehearse-postgresql-cutover.mjs', import.meta.url),
    'utf8',
  );
  assert.match(script, /mode !== 'restore'/);
  assert.match(script, /RECOVERY_EVIDENCE_REPORT_ORIGIN_MUST_BE_AN_ORIGIN/);
  assert.match(script, /RECOVERY_EVIDENCE_REPORT_ORIGIN_MUST_USE_HTTPS/);
  assert.match(script, /acknowledgement\.evidenceId !== evidenceId/);
  assert.match(script, /const safeEvidence = \{/);
  assert.doesNotMatch(script, /safeEvidence\s*=\s*evidence\b/);
  assert.doesNotMatch(script, /body:\s*JSON\.stringify\(evidence\)/);
});
