import 'server-only';

import { createHash, randomUUID } from 'node:crypto';

import {
  NOTIFICATION_BATCH_DEFAULT,
  NOTIFICATION_BATCH_MAXIMUM,
  NOTIFICATION_BATCH_MINIMUM,
  NOTIFICATION_LEASE_SECONDS_DEFAULT,
  NOTIFICATION_LEASE_SECONDS_MAXIMUM,
  NOTIFICATION_LEASE_SECONDS_MINIMUM,
  boundedNotificationInteger,
  notificationSummaryProcessed,
} from '@/lib/automation/notificationRules';
import { prisma } from '@/lib/prisma';
import { deliverPendingNotifications } from '@/services/notificationDeliveryService';

const JOB_KEY = 'NOTIFICATION_DELIVERY_V1';

export class NotificationAutomationError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'NotificationAutomationError';
  }
}

export interface NotificationAutomationSummary {
  correlationId: string;
  deadLettered: number;
  delivered: number;
  failed: number;
  processedCount: number;
  status: 'SUCCEEDED';
}

function tokenHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function safeErrorCode(error: unknown): string {
  if (error instanceof NotificationAutomationError) return error.code;
  if (error instanceof Error && error.name) return error.name.slice(0, 80);
  return 'UNKNOWN_NOTIFICATION_FAILURE';
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

export async function runNotificationAutomation(input?: {
  batchSize?: unknown;
  correlationId?: string;
  leaseSeconds?: unknown;
  now?: Date;
}): Promise<NotificationAutomationSummary> {
  const batchSize = boundedNotificationInteger(
    input?.batchSize,
    NOTIFICATION_BATCH_DEFAULT,
    NOTIFICATION_BATCH_MINIMUM,
    NOTIFICATION_BATCH_MAXIMUM,
  );
  const leaseSeconds = boundedNotificationInteger(
    input?.leaseSeconds,
    NOTIFICATION_LEASE_SECONDS_DEFAULT,
    NOTIFICATION_LEASE_SECONDS_MINIMUM,
    NOTIFICATION_LEASE_SECONDS_MAXIMUM,
  );
  const now = input?.now ?? new Date();
  const correlationId = input?.correlationId?.trim() || randomUUID();
  if (correlationId.length > 120) {
    throw new NotificationAutomationError('INVALID_CORRELATION_ID');
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
      return parsed as NotificationAutomationSummary;
    }
    throw new NotificationAutomationError('AUTOMATION_EVIDENCE_INVALID');
  }
  if (existingRun) throw new NotificationAutomationError('DUPLICATE_CORRELATION_ID');

  const leaseTokenHash = tokenHash(randomUUID());
  if (!(await acquireLease({ leaseSeconds, now, tokenHash: leaseTokenHash }))) {
    throw new NotificationAutomationError('AUTOMATION_ALREADY_RUNNING');
  }

  const run = await prisma.automationJobRun.create({
    data: { correlationId, jobKey: JOB_KEY, status: 'RUNNING' },
  });
  try {
    const delivery = await deliverPendingNotifications(batchSize);
    const result: NotificationAutomationSummary = {
      correlationId,
      ...delivery,
      processedCount: notificationSummaryProcessed(delivery),
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
