import 'server-only';

import { createHash, randomUUID } from 'node:crypto';

import {
  INTEGRATION_OUTBOX_BATCH_DEFAULT,
  INTEGRATION_OUTBOX_BATCH_MAXIMUM,
  INTEGRATION_OUTBOX_BATCH_MINIMUM,
  INTEGRATION_OUTBOX_LEASE_SECONDS_DEFAULT,
  INTEGRATION_OUTBOX_LEASE_SECONDS_MAXIMUM,
  INTEGRATION_OUTBOX_LEASE_SECONDS_MINIMUM,
  boundedIntegrationOutboxInteger,
  integrationOutboxSummaryProcessed,
} from '@/lib/automation/integrationOutboxRules';
import { prisma } from '@/lib/prisma';
import { integrationOutboxService } from '@/services/integrationOutboxService';
import {
  deliverIntegrationOutboxEvent,
  integrationOutboxProviderConfiguration,
} from '@/services/integrationOutboxProviderService';

const JOB_KEY = 'INTEGRATION_OUTBOX_DELIVERY_V1';

export class IntegrationOutboxAutomationError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'IntegrationOutboxAutomationError';
  }
}

export interface IntegrationOutboxAutomationSummary {
  correlationId: string;
  deadLettered: number;
  delivered: number;
  failed: number;
  processedCount: number;
  recovered: number;
  status: 'SUCCEEDED';
}

function tokenHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function safeErrorCode(error: unknown): string {
  if (error instanceof IntegrationOutboxAutomationError) return error.code;
  if (error instanceof Error && error.name) return error.name.slice(0, 80);
  return 'UNKNOWN_INTEGRATION_OUTBOX_FAILURE';
}

function storedSummary(
  summaryJson: string,
  correlationId: string,
): IntegrationOutboxAutomationSummary | null {
  try {
    const parsed: unknown = JSON.parse(summaryJson);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    const count = (key: string): number | null => {
      const value = record[key];
      return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
    };
    const deadLettered = count('deadLettered');
    const delivered = count('delivered');
    const failed = count('failed');
    const processedCount = count('processedCount');
    const recovered = count('recovered');
    if (
      record.correlationId !== correlationId ||
      record.status !== 'SUCCEEDED' ||
      deadLettered === null ||
      delivered === null ||
      failed === null ||
      processedCount === null ||
      recovered === null ||
      processedCount !== delivered + failed
    ) {
      return null;
    }
    return {
      correlationId,
      deadLettered,
      delivered,
      failed,
      processedCount,
      recovered,
      status: 'SUCCEEDED',
    };
  } catch {
    return null;
  }
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

export async function runIntegrationOutboxAutomation(input?: {
  batchSize?: unknown;
  correlationId?: string;
  leaseSeconds?: unknown;
  now?: Date;
}): Promise<IntegrationOutboxAutomationSummary> {
  const batchSize = boundedIntegrationOutboxInteger(
    input?.batchSize,
    INTEGRATION_OUTBOX_BATCH_DEFAULT,
    INTEGRATION_OUTBOX_BATCH_MINIMUM,
    INTEGRATION_OUTBOX_BATCH_MAXIMUM,
  );
  const leaseSeconds = boundedIntegrationOutboxInteger(
    input?.leaseSeconds,
    INTEGRATION_OUTBOX_LEASE_SECONDS_DEFAULT,
    INTEGRATION_OUTBOX_LEASE_SECONDS_MINIMUM,
    INTEGRATION_OUTBOX_LEASE_SECONDS_MAXIMUM,
  );
  const now = input?.now ?? new Date();
  const correlationId = input?.correlationId?.trim() || randomUUID();
  if (correlationId.length > 120) {
    throw new IntegrationOutboxAutomationError('INVALID_CORRELATION_ID');
  }

  const existingRun = await prisma.automationJobRun.findUnique({ where: { correlationId } });
  if (existingRun?.jobKey === JOB_KEY && existingRun.status === 'SUCCEEDED') {
    const summary = storedSummary(existingRun.summaryJson, correlationId);
    if (summary) return summary;
    throw new IntegrationOutboxAutomationError('AUTOMATION_EVIDENCE_INVALID');
  }
  if (existingRun) throw new IntegrationOutboxAutomationError('DUPLICATE_CORRELATION_ID');

  const leaseTokenHash = tokenHash(randomUUID());
  if (!(await acquireLease({ leaseSeconds, now, tokenHash: leaseTokenHash }))) {
    throw new IntegrationOutboxAutomationError('AUTOMATION_ALREADY_RUNNING');
  }

  const run = await prisma.automationJobRun.create({
    data: { correlationId, jobKey: JOB_KEY, status: 'RUNNING' },
  });
  try {
    integrationOutboxProviderConfiguration();
    const delivery = await integrationOutboxService.deliverPending(
      { deliver: deliverIntegrationOutboxEvent },
      batchSize,
    );
    const result: IntegrationOutboxAutomationSummary = {
      correlationId,
      ...delivery,
      processedCount: integrationOutboxSummaryProcessed(delivery),
      status: 'SUCCEEDED',
    };
    const completedAt = new Date();
    const summaryJson = JSON.stringify(result);
    await prisma.$transaction([
      prisma.automationJobRun.update({
        data: {
          completedAt,
          failureCount: result.failed,
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
