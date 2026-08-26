import 'server-only';

import { createHash, randomUUID } from 'node:crypto';

import {
  SEARCH_PROJECTION_LEASE_SECONDS_DEFAULT,
  SEARCH_PROJECTION_LEASE_SECONDS_MAXIMUM,
  SEARCH_PROJECTION_LEASE_SECONDS_MINIMUM,
  SEARCH_PROJECTION_SOURCE_LIMIT_DEFAULT,
  SEARCH_PROJECTION_SOURCE_LIMIT_MAXIMUM,
  SEARCH_PROJECTION_SOURCE_LIMIT_MINIMUM,
  boundedSearchProjectionInteger,
  shouldRebuildSearchProjections,
} from '@/lib/automation/searchProjectionRules';
import { prisma } from '@/lib/prisma';
import {
  getHotelSearchProjectionHealth,
  rebuildHotelSearchProjectionsInTransaction,
} from '@/services/searchProjectionService';

const JOB_KEY = 'SEARCH_PROJECTION_MAINTENANCE_V1';

export class SearchProjectionAutomationError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'SearchProjectionAutomationError';
  }
}

export interface SearchProjectionAutomationSummary {
  correlationId: string;
  projected: number;
  rebuilt: boolean;
  removed: number;
  sourceCount: number;
  status: 'SUCCEEDED';
}

function tokenHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function safeErrorCode(error: unknown): string {
  if (error instanceof SearchProjectionAutomationError) return error.code;
  if (error instanceof Error && error.message === 'SEARCH_PROJECTION_SOURCE_LIMIT_EXCEEDED') {
    return error.message;
  }
  if (error instanceof Error && error.name) return error.name.slice(0, 80);
  return 'UNKNOWN_SEARCH_PROJECTION_FAILURE';
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

export async function runSearchProjectionAutomation(input?: {
  correlationId?: string;
  leaseSeconds?: unknown;
  maximumSourceCount?: unknown;
  now?: Date;
}): Promise<SearchProjectionAutomationSummary> {
  const leaseSeconds = boundedSearchProjectionInteger(
    input?.leaseSeconds,
    SEARCH_PROJECTION_LEASE_SECONDS_DEFAULT,
    SEARCH_PROJECTION_LEASE_SECONDS_MINIMUM,
    SEARCH_PROJECTION_LEASE_SECONDS_MAXIMUM,
  );
  const maximumSourceCount = boundedSearchProjectionInteger(
    input?.maximumSourceCount,
    SEARCH_PROJECTION_SOURCE_LIMIT_DEFAULT,
    SEARCH_PROJECTION_SOURCE_LIMIT_MINIMUM,
    SEARCH_PROJECTION_SOURCE_LIMIT_MAXIMUM,
  );
  const now = input?.now ?? new Date();
  const correlationId = input?.correlationId?.trim() || randomUUID();
  if (correlationId.length > 120) {
    throw new SearchProjectionAutomationError('INVALID_CORRELATION_ID');
  }

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
      return parsed as SearchProjectionAutomationSummary;
    }
    throw new SearchProjectionAutomationError('AUTOMATION_EVIDENCE_INVALID');
  }
  if (existingRun) throw new SearchProjectionAutomationError('DUPLICATE_CORRELATION_ID');

  const leaseTokenHash = tokenHash(randomUUID());
  if (!(await acquireLease({ leaseSeconds, now, tokenHash: leaseTokenHash }))) {
    throw new SearchProjectionAutomationError('AUTOMATION_ALREADY_RUNNING');
  }
  const run = await prisma.automationJobRun.create({
    data: { correlationId, jobKey: JOB_KEY, status: 'RUNNING' },
  });

  try {
    const health = await getHotelSearchProjectionHealth();
    if (health.sourceCount > maximumSourceCount) {
      throw new SearchProjectionAutomationError('SEARCH_PROJECTION_SOURCE_LIMIT_EXCEEDED');
    }
    const rebuild = shouldRebuildSearchProjections(health.status)
      ? await prisma.$transaction((transaction) =>
          rebuildHotelSearchProjectionsInTransaction(transaction, { maximumSourceCount }),
        )
      : { projected: 0, removed: 0, sourceCount: health.sourceCount };
    const result: SearchProjectionAutomationSummary = {
      correlationId,
      projected: rebuild.projected,
      rebuilt: shouldRebuildSearchProjections(health.status),
      removed: rebuild.removed,
      sourceCount: rebuild.sourceCount,
      status: 'SUCCEEDED',
    };
    const completedAt = new Date();
    const summaryJson = JSON.stringify(result);
    await prisma.$transaction([
      prisma.automationJobRun.update({
        data: {
          completedAt,
          processedCount: result.projected + result.removed,
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
    if (error instanceof Error && error.message === 'SEARCH_PROJECTION_SOURCE_LIMIT_EXCEEDED') {
      throw new SearchProjectionAutomationError(error.message);
    }
    throw error;
  }
}
