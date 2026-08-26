import 'server-only';

import {
  normalizeDatabaseRecoveryEvidence,
  type DatabaseRecoveryEvidence,
} from '@/lib/automation/recoveryEvidenceRules';
import { prisma } from '@/lib/prisma';

const JOB_KEY = 'DATABASE_RESTORE_VERIFICATION_V1';

export class DatabaseRecoveryEvidenceError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'DatabaseRecoveryEvidenceError';
  }
}

export type DatabaseRecoveryEvidenceSummary = DatabaseRecoveryEvidence & {
  recoveryVerified: true;
  status: 'SUCCEEDED';
};

function existingSummary(
  summaryJson: string,
  evidenceId: string,
): DatabaseRecoveryEvidenceSummary | null {
  try {
    const summary: unknown = JSON.parse(summaryJson);
    return summary &&
      typeof summary === 'object' &&
      !Array.isArray(summary) &&
      (summary as { evidenceId?: unknown }).evidenceId === evidenceId
      ? (summary as DatabaseRecoveryEvidenceSummary)
      : null;
  } catch {
    return null;
  }
}

export async function recordDatabaseRecoveryEvidence(
  input: unknown,
  now = new Date(),
): Promise<DatabaseRecoveryEvidenceSummary> {
  const evidence = normalizeDatabaseRecoveryEvidence(input, now);
  if (!evidence) throw new DatabaseRecoveryEvidenceError('INVALID_RECOVERY_EVIDENCE');
  const correlationId = `restore:${evidence.evidenceId}`;
  const existing = await prisma.automationJobRun.findUnique({ where: { correlationId } });
  if (existing?.jobKey === JOB_KEY && existing.status === 'SUCCEEDED') {
    const summary = existingSummary(existing.summaryJson, evidence.evidenceId);
    if (summary) return summary;
    throw new DatabaseRecoveryEvidenceError('RECOVERY_EVIDENCE_CONFLICT');
  }
  if (existing) throw new DatabaseRecoveryEvidenceError('RECOVERY_EVIDENCE_CONFLICT');

  const summary: DatabaseRecoveryEvidenceSummary = {
    ...evidence,
    recoveryVerified: true,
    status: 'SUCCEEDED',
  };
  try {
    await prisma.automationJobRun.create({
      data: {
        completedAt: now,
        correlationId,
        jobKey: JOB_KEY,
        processedCount: evidence.canonicalTableCount,
        status: 'SUCCEEDED',
        summaryJson: JSON.stringify(summary),
      },
    });
  } catch (error) {
    if (
      !error ||
      typeof error !== 'object' ||
      !('code' in error) ||
      (error as { code?: unknown }).code !== 'P2002'
    ) {
      throw error;
    }
    const replay = await prisma.automationJobRun.findUnique({ where: { correlationId } });
    const replaySummary =
      replay?.jobKey === JOB_KEY ? existingSummary(replay.summaryJson, evidence.evidenceId) : null;
    if (replay?.status === 'SUCCEEDED' && replaySummary) return replaySummary;
    throw new DatabaseRecoveryEvidenceError('RECOVERY_EVIDENCE_CONFLICT');
  }
  return summary;
}
