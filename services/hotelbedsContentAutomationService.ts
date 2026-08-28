import 'server-only';

import { createHash, randomUUID } from 'node:crypto';

import {
  HOTELBEDS_CONTENT_PAGE_SIZE,
  boundedHotelbedsContentPages,
  planHotelbedsContentSync,
} from '@/lib/hotel/hotelbedsContentRules';
import { readHotelbedsConfiguration } from '@/lib/hotel/hotelbedsRules';
import { prisma } from '@/lib/prisma';
import { HotelbedsEvaluationAdapter } from '@/repositories/hotelbedsEvaluationAdapter';

const JOB_KEY = 'HOTELBEDS_CONTENT_CACHE_V1';
const LEASE_SECONDS = 300;

export class HotelbedsContentAutomationError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'HotelbedsContentAutomationError';
  }
}

export interface HotelbedsContentAutomationSummary {
  correlationId: string;
  differentialDate?: string;
  fetched: number;
  language: string;
  mode: 'DIFFERENTIAL' | 'INITIAL';
  nextFrom?: number;
  pages: number;
  status: 'SUCCEEDED';
  unchanged: number;
  upserted: number;
}

function tokenHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function safeErrorCode(error: unknown): string {
  if (error instanceof HotelbedsContentAutomationError) return error.code;
  if (error instanceof Error && error.name) return error.name.slice(0, 80);
  return 'UNKNOWN_HOTELBEDS_CONTENT_FAILURE';
}

function contentLanguage(value: string | undefined): string {
  const language = (value ?? 'ENG').trim().toUpperCase();
  if (!/^[A-Z]{3,6}$/.test(language)) {
    throw new HotelbedsContentAutomationError('INVALID_CONTENT_LANGUAGE');
  }
  return language;
}

async function acquireLease(now: Date, leaseTokenHash: string): Promise<boolean> {
  const leaseExpiresAt = new Date(now.getTime() + LEASE_SECONDS * 1_000);
  try {
    await prisma.automationJobLease.create({
      data: {
        jobKey: JOB_KEY,
        lastStartedAt: now,
        lastStatus: 'RUNNING',
        leaseExpiresAt,
        leaseTokenHash,
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
  const result = await prisma.automationJobLease.updateMany({
    data: { lastStartedAt: now, lastStatus: 'RUNNING', leaseExpiresAt, leaseTokenHash },
    where: { jobKey: JOB_KEY, leaseExpiresAt: { lte: now } },
  });
  return result.count === 1;
}

export async function runHotelbedsContentAutomation(input?: {
  correlationId?: string;
  maximumPages?: unknown;
  now?: Date;
}): Promise<HotelbedsContentAutomationSummary> {
  if (process.env.HOTELBEDS_CONTENT_SYNC_ENABLED !== 'true') {
    throw new HotelbedsContentAutomationError('CONTENT_SYNC_DISABLED');
  }
  const configuration = readHotelbedsConfiguration(process.env);
  if (!configuration) throw new HotelbedsContentAutomationError('HOTELBEDS_DISABLED');
  const maximumPages = boundedHotelbedsContentPages(input?.maximumPages);
  const language = contentLanguage(process.env.HOTELBEDS_CONTENT_LANGUAGE);
  const now = input?.now ?? new Date();
  const correlationId = input?.correlationId?.trim() || randomUUID();
  if (correlationId.length > 120) {
    throw new HotelbedsContentAutomationError('INVALID_CORRELATION_ID');
  }

  const existingRun = await prisma.automationJobRun.findUnique({ where: { correlationId } });
  if (existingRun?.status === 'SUCCEEDED') {
    const parsed: unknown = JSON.parse(existingRun.summaryJson);
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      (parsed as { correlationId?: unknown }).correlationId === correlationId
    ) {
      return parsed as HotelbedsContentAutomationSummary;
    }
    throw new HotelbedsContentAutomationError('AUTOMATION_EVIDENCE_INVALID');
  }
  if (existingRun) throw new HotelbedsContentAutomationError('DUPLICATE_CORRELATION_ID');

  const leaseTokenHash = tokenHash(randomUUID());
  if (!(await acquireLease(now, leaseTokenHash))) {
    throw new HotelbedsContentAutomationError('AUTOMATION_ALREADY_RUNNING');
  }
  const run = await prisma.automationJobRun.create({
    data: { correlationId, jobKey: JOB_KEY, status: 'RUNNING' },
  });

  try {
    const [cachedCount, lastSuccess] = await Promise.all([
      prisma.hotelbedsContentProperty.count({ where: { active: true, language } }),
      prisma.automationJobRun.findFirst({
        orderBy: { completedAt: 'desc' },
        where: { completedAt: { not: null }, jobKey: JOB_KEY, status: 'SUCCEEDED' },
      }),
    ]);
    const plan = planHotelbedsContentSync({
      cachedCount,
      lastSuccessfulCompletedAt: lastSuccess?.completedAt ?? undefined,
      lastSuccessfulSummaryJson: lastSuccess?.summaryJson,
    });
    const { lastUpdateTime, mode } = plan;
    const adapter = new HotelbedsEvaluationAdapter(configuration);
    let from = plan.from;
    let fetched = 0;
    let pages = 0;
    let unchanged = 0;
    let upserted = 0;
    let complete = false;

    while (pages < maximumPages && !complete) {
      const page = await adapter.fetchContentPage({
        from,
        language,
        lastUpdateTime,
        to: from + HOTELBEDS_CONTENT_PAGE_SIZE - 1,
      });
      const existing = await prisma.hotelbedsContentProperty.findMany({
        select: { contentHash: true, providerHotelCode: true },
        where: {
          language,
          providerHotelCode: { in: page.hotels.map((hotel) => hotel.providerHotelCode) },
        },
      });
      const hashes = new Map(existing.map((hotel) => [hotel.providerHotelCode, hotel.contentHash]));
      const changed = page.hotels.filter(
        (hotel) => hashes.get(hotel.providerHotelCode) !== hotel.contentHash,
      );
      unchanged += page.hotels.length - changed.length;
      if (changed.length > 0) {
        await prisma.$transaction(
          changed.map((hotel) =>
            prisma.hotelbedsContentProperty.upsert({
              create: {
                active: true,
                contentHash: hotel.contentHash,
                fetchedAt: now,
                language,
                payloadJson: hotel.payloadJson,
                providerHotelCode: hotel.providerHotelCode,
                providerUpdatedAt: hotel.providerUpdatedAt,
                syncCorrelationId: correlationId,
              },
              update: {
                active: true,
                contentHash: hotel.contentHash,
                fetchedAt: now,
                language,
                payloadJson: hotel.payloadJson,
                providerUpdatedAt: hotel.providerUpdatedAt,
                syncCorrelationId: correlationId,
              },
              where: {
                language_providerHotelCode: {
                  language,
                  providerHotelCode: hotel.providerHotelCode,
                },
              },
            }),
          ),
        );
      }
      fetched += page.hotels.length;
      upserted += changed.length;
      pages += 1;
      from += HOTELBEDS_CONTENT_PAGE_SIZE;
      complete =
        page.hotels.length < HOTELBEDS_CONTENT_PAGE_SIZE ||
        (page.total !== undefined && from > page.total);
    }

    const result: HotelbedsContentAutomationSummary = {
      correlationId,
      ...(lastUpdateTime ? { differentialDate: lastUpdateTime.toISOString().slice(0, 10) } : {}),
      fetched,
      language,
      mode,
      ...(complete ? {} : { nextFrom: from }),
      pages,
      status: 'SUCCEEDED',
      unchanged,
      upserted,
    };
    const completedAt = new Date();
    const summaryJson = JSON.stringify(result);
    await prisma.$transaction([
      prisma.automationJobRun.update({
        data: { completedAt, processedCount: fetched, status: 'SUCCEEDED', summaryJson },
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
    await prisma.$transaction([
      prisma.automationJobRun.update({
        data: {
          completedAt,
          errorCode: safeErrorCode(error),
          failureCount: 1,
          status: 'FAILED',
        },
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
