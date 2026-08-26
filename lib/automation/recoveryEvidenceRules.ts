import { createHash } from 'node:crypto';

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const MAXIMUM_EVIDENCE_AGE_MS = 60 * 60 * 1_000;
const MAXIMUM_CLOCK_SKEW_MS = 5 * 60 * 1_000;

export type DatabaseRecoveryEvidence = {
  baselineSha256: string;
  canonicalTableCount: number;
  evidenceId: string;
  financialMetricCount: number;
  foreignKeyFailures: 0;
  integrity: 'constraints-validated';
  mismatchCount: 0;
  mode: 'restore';
  verifiedAt: string;
};

function boundedCount(value: unknown, minimum: number, maximum: number): number | null {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum
    ? Number(value)
    : null;
}

export function normalizeDatabaseRecoveryEvidence(
  value: unknown,
  now = new Date(),
): DatabaseRecoveryEvidence | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const verifiedAt = typeof record.verifiedAt === 'string' ? new Date(record.verifiedAt) : null;
  const age = verifiedAt ? now.getTime() - verifiedAt.getTime() : Number.NaN;
  const canonicalTableCount = boundedCount(record.canonicalTableCount, 1, 1_000);
  const financialMetricCount = boundedCount(record.financialMetricCount, 1, 1_000);
  if (
    typeof record.evidenceId !== 'string' ||
    !SHA256_PATTERN.test(record.evidenceId) ||
    typeof record.baselineSha256 !== 'string' ||
    !SHA256_PATTERN.test(record.baselineSha256) ||
    canonicalTableCount === null ||
    financialMetricCount === null ||
    record.foreignKeyFailures !== 0 ||
    record.integrity !== 'constraints-validated' ||
    record.mismatchCount !== 0 ||
    record.mode !== 'restore' ||
    !verifiedAt ||
    !Number.isFinite(age) ||
    age < -MAXIMUM_CLOCK_SKEW_MS ||
    age > MAXIMUM_EVIDENCE_AGE_MS
  ) {
    return null;
  }
  const normalized = {
    baselineSha256: record.baselineSha256,
    canonicalTableCount,
    financialMetricCount,
    foreignKeyFailures: 0,
    integrity: 'constraints-validated',
    mismatchCount: 0,
    mode: 'restore',
    verifiedAt: verifiedAt.toISOString(),
  } as const;
  const expectedEvidenceId = createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
  return record.evidenceId === expectedEvidenceId
    ? { ...normalized, evidenceId: record.evidenceId }
    : null;
}
