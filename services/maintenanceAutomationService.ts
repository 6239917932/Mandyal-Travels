import 'server-only';

import { createHash, randomUUID } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import {
  MAINTENANCE_BATCH_DEFAULT,
  MAINTENANCE_BATCH_MAXIMUM,
  MAINTENANCE_BATCH_MINIMUM,
  MAINTENANCE_LEASE_SECONDS_DEFAULT,
  MAINTENANCE_LEASE_SECONDS_MAXIMUM,
  MAINTENANCE_LEASE_SECONDS_MINIMUM,
  boundedMaintenanceInteger,
  maintenanceSummaryProcessed,
} from '@/lib/automation/maintenanceRules';
import { releaseExpiredPromotionClaimsBatch } from '@/services/promotionRedemptionService';

const JOB_KEY = 'SAFE_MAINTENANCE_V1';

export class MaintenanceAutomationError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'MaintenanceAutomationError';
  }
}

export interface MaintenanceAutomationSummary {
  correlationId: string;
  expiredAvailabilityLocks: number;
  expiredBusSeatHolds: number;
  releasedPromotionClaims: number;
  processedCount: number;
  status: 'SUCCEEDED';
}

function tokenHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function safeErrorCode(error: unknown): string {
  if (error instanceof MaintenanceAutomationError) return error.code;
  if (error instanceof Error && error.name) return error.name.slice(0, 80);
  return 'UNKNOWN_AUTOMATION_FAILURE';
}

async function acquireLease(input: {
  leaseSeconds: number;
  now: Date;
  tokenHash: string;
}): Promise<boolean> {
  const leaseExpiresAt = new Date(input.now.getTime() + input.leaseSeconds * 1_000);
  try {
    await prisma.automationJobLease.create({
      data: {
        jobKey: JOB_KEY,
        lastStartedAt: input.now,
        lastStatus: 'RUNNING',
        leaseExpiresAt,
        leaseTokenHash: input.tokenHash,
      },
    });
    return true;
  } catch (error) {
    if (
      !error ||
      typeof error !== 'object' ||
      !('code' in error) ||
      (error as { code?: unknown }).code !== 'P2002'
    ) {
      throw error;
    }
  }
  const acquired = await prisma.automationJobLease.updateMany({
    data: {
      lastStartedAt: input.now,
      lastStatus: 'RUNNING',
      leaseExpiresAt,
      leaseTokenHash: input.tokenHash,
    },
    where: { jobKey: JOB_KEY, leaseExpiresAt: { lte: input.now } },
  });
  return acquired.count === 1;
}

export async function runSafeMaintenanceAutomation(input?: {
  batchSize?: unknown;
  correlationId?: string;
  leaseSeconds?: unknown;
  now?: Date;
}): Promise<MaintenanceAutomationSummary> {
  const batchSize = boundedMaintenanceInteger(
    input?.batchSize,
    MAINTENANCE_BATCH_DEFAULT,
    MAINTENANCE_BATCH_MINIMUM,
    MAINTENANCE_BATCH_MAXIMUM,
  );
  const leaseSeconds = boundedMaintenanceInteger(
    input?.leaseSeconds,
    MAINTENANCE_LEASE_SECONDS_DEFAULT,
    MAINTENANCE_LEASE_SECONDS_MINIMUM,
    MAINTENANCE_LEASE_SECONDS_MAXIMUM,
  );
  const now = input?.now ?? new Date();
  const correlationId = input?.correlationId?.trim() || randomUUID();
  if (correlationId.length > 120) throw new MaintenanceAutomationError('INVALID_CORRELATION_ID');
  const existingRun = await prisma.automationJobRun.findUnique({ where: { correlationId } });
  if (existingRun?.status === 'SUCCEEDED') {
    const parsed: unknown = JSON.parse(existingRun.summaryJson);
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      (parsed as { correlationId?: unknown }).correlationId === correlationId &&
      (parsed as { status?: unknown }).status === 'SUCCEEDED'
    ) {
      return parsed as MaintenanceAutomationSummary;
    }
    throw new MaintenanceAutomationError('AUTOMATION_EVIDENCE_INVALID');
  }
  if (existingRun) throw new MaintenanceAutomationError('DUPLICATE_CORRELATION_ID');
  const leaseTokenHash = tokenHash(randomUUID());
  if (!(await acquireLease({ leaseSeconds, now, tokenHash: leaseTokenHash }))) {
    throw new MaintenanceAutomationError('AUTOMATION_ALREADY_RUNNING');
  }

  const run = await prisma.automationJobRun.create({
    data: { correlationId, jobKey: JOB_KEY, status: 'RUNNING' },
  });
  try {
    const expiredBusSeatHolds = await prisma.$transaction(async (transaction) => {
      const holds = await transaction.partnerBusSeatHold.findMany({
        orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
        select: { id: true },
        take: batchSize,
        where: { expiresAt: { lte: now } },
      });
      if (holds.length === 0) return 0;
      const deleted = await transaction.partnerBusSeatHold.deleteMany({
        where: { id: { in: holds.map((hold) => hold.id) }, expiresAt: { lte: now } },
      });
      return deleted.count;
    });
    const lockIds = await prisma.availabilityLock.findMany({
      orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
      take: batchSize,
      where: { expiresAt: { lte: now }, status: 'active' },
    });
    const expiredAvailabilityLocks = lockIds.length
      ? (
          await prisma.availabilityLock.updateMany({
            data: { status: 'expired' },
            where: {
              expiresAt: { lte: now },
              id: { in: lockIds.map((lock) => lock.id) },
              status: 'active',
            },
          })
        ).count
      : 0;
    const releasedPromotionClaims = await prisma.$transaction((transaction) =>
      releaseExpiredPromotionClaimsBatch(transaction, now, batchSize),
    );
    const result = {
      correlationId,
      expiredAvailabilityLocks,
      expiredBusSeatHolds,
      releasedPromotionClaims,
      processedCount: 0,
      status: 'SUCCEEDED' as const,
    };
    result.processedCount = maintenanceSummaryProcessed(result);
    const completedAt = new Date();
    const summaryJson = JSON.stringify(result);
    await prisma.$transaction([
      prisma.automationJobRun.update({
        data: {
          completedAt,
          processedCount: result.processedCount,
          status: 'SUCCEEDED',
          summaryJson,
        },
        where: { id: run.id },
      }),
      prisma.automationJobLease.updateMany({
        data: {
          lastCompletedAt: completedAt,
          lastStatus: 'SUCCEEDED',
          lastSummaryJson: summaryJson,
          leaseExpiresAt: completedAt,
        },
        where: { jobKey: JOB_KEY, leaseTokenHash },
      }),
    ]);
    return result;
  } catch (error) {
    const completedAt = new Date();
    const errorCode = safeErrorCode(error);
    await prisma.$transaction([
      prisma.automationJobRun.update({
        data: { completedAt, errorCode, failureCount: 1, status: 'FAILED' },
        where: { id: run.id },
      }),
      prisma.automationJobLease.updateMany({
        data: { lastCompletedAt: completedAt, lastStatus: 'FAILED', leaseExpiresAt: completedAt },
        where: { jobKey: JOB_KEY, leaseTokenHash },
      }),
    ]);
    throw error;
  }
}
