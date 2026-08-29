import { hotelbedsContentDeploymentReadiness } from '@/lib/hotel/hotelbedsDeploymentReadiness';
import { inspectHotelbedsConfiguration } from '@/lib/hotel/hotelbedsRules';
import { prisma } from '@/lib/prisma';
import { emitOperationalEvent } from '@/lib/observability/operations';
import { getHotelbedsContentReadiness } from '@/services/hotelbedsContentReadinessService';

const RESPONSE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET() {
  const checkedAt = new Date().toISOString();

  try {
    const syncEnabled = process.env.HOTELBEDS_CONTENT_SYNC_ENABLED === 'true';
    const [databaseResult, hotelbedsContent] = await Promise.all([
      prisma.$transaction([
        prisma.user.findFirst({ select: { id: true } }),
        prisma.organization.findFirst({ select: { id: true } }),
        prisma.booking.findFirst({ select: { id: true } }),
        prisma.businessTravelRequest.findFirst({ select: { id: true } }),
        prisma.integrationOutboxEvent.count({ where: { status: 'DEAD_LETTER' } }),
        prisma.integrationOutboxEvent.count({
          where: { status: { in: ['PENDING', 'PROCESSING'] } },
        }),
      ]),
      syncEnabled ? getHotelbedsContentReadiness() : Promise.resolve(undefined),
    ]);
    const deadLetterCount = databaseResult[4];
    const pendingCount = databaseResult[5];
    const hotelbeds = hotelbedsContentDeploymentReadiness({
      configuration: inspectHotelbedsConfiguration(process.env),
      ...(hotelbedsContent ? { content: hotelbedsContent } : {}),
      syncEnabled,
    });
    const unavailable = hotelbeds.status === 'unavailable';
    if (unavailable) {
      emitOperationalEvent({
        event: 'health.hotelbeds_content.unavailable',
        result: 'degraded',
        severity: 'warning',
      });
    }
    return Response.json(
      {
        data: {
          checkedAt,
          database: 'ready',
          integrations: {
            deadLetterCount,
            hotelbedsContent: hotelbeds,
            pendingCount,
            status:
              unavailable || deadLetterCount
                ? 'attention'
                : hotelbeds.status === 'attention'
                  ? 'attention'
                  : 'ready',
          },
          schema: 'ready',
          status: unavailable ? 'unavailable' : 'ready',
        },
        ...(unavailable ? { error: 'A required supplier content dependency is not ready.' } : {}),
      },
      { headers: RESPONSE_HEADERS, status: unavailable ? 503 : 200 },
    );
  } catch (error) {
    emitOperationalEvent({
      event: 'health.readiness.failed',
      result: 'failure',
      severity: 'error',
    });
    console.error('Portal readiness check failed.', error);
    return Response.json(
      {
        data: { checkedAt, status: 'unavailable' },
        error: 'The portal database is temporarily unavailable.',
      },
      { headers: RESPONSE_HEADERS, status: 503 },
    );
  }
}
