import 'server-only';

import {
  HOTELBEDS_CONTENT_JOB_KEY,
  type HotelbedsContentReadiness,
  type HotelbedsContentRunRecord,
  hotelbedsContentReadiness,
} from '@/lib/hotel/hotelbedsContentReadiness';
import { prisma } from '@/lib/prisma';

const RECENT_RUN_LIMIT = 10;

export type HotelbedsContentReadinessResult =
  | {
      available: false;
      state: 'MIGRATION_REQUIRED';
    }
  | {
      available: true;
      readiness: HotelbedsContentReadiness;
      recentRuns: readonly HotelbedsContentRunRecord[];
    };

export async function getHotelbedsContentReadiness(
  now = new Date(),
): Promise<HotelbedsContentReadinessResult> {
  try {
    const [activePropertyCount, newestProperty, recentRuns] = await Promise.all([
      prisma.hotelbedsContentProperty.count({ where: { active: true } }),
      prisma.hotelbedsContentProperty.findFirst({
        orderBy: { fetchedAt: 'desc' },
        select: { fetchedAt: true },
        where: { active: true },
      }),
      prisma.automationJobRun.findMany({
        orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
        select: {
          completedAt: true,
          errorCode: true,
          failureCount: true,
          processedCount: true,
          startedAt: true,
          status: true,
          summaryJson: true,
        },
        take: RECENT_RUN_LIMIT,
        where: { jobKey: HOTELBEDS_CONTENT_JOB_KEY },
      }),
    ]);
    return {
      available: true,
      readiness: hotelbedsContentReadiness({
        activePropertyCount,
        ...(recentRuns[0] ? { lastRun: recentRuns[0] } : {}),
        ...(newestProperty ? { newestFetchedAt: newestProperty.fetchedAt } : {}),
        now,
      }),
      recentRuns,
    };
  } catch {
    return { available: false, state: 'MIGRATION_REQUIRED' };
  }
}
