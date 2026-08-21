import { prisma } from '@/lib/prisma';
import { emitOperationalEvent } from '@/lib/observability/operations';

const RESPONSE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET() {
  const checkedAt = new Date().toISOString();

  try {
    const [, , , , outbox] = await prisma.$transaction([
      prisma.user.findFirst({ select: { id: true } }),
      prisma.organization.findFirst({ select: { id: true } }),
      prisma.booking.findFirst({ select: { id: true } }),
      prisma.businessTravelRequest.findFirst({ select: { id: true } }),
      prisma.integrationOutboxEvent.groupBy({
        _count: { _all: true },
        by: ['status'],
        where: { status: { in: ['DEAD_LETTER', 'PENDING', 'PROCESSING'] } },
      }),
    ]);
    const deadLetterCount =
      outbox.find((entry) => entry.status === 'DEAD_LETTER')?._count._all ?? 0;
    const pendingCount = outbox
      .filter((entry) => entry.status === 'PENDING' || entry.status === 'PROCESSING')
      .reduce((total, entry) => total + entry._count._all, 0);
    return Response.json(
      {
        data: {
          checkedAt,
          database: 'ready',
          integrations: {
            deadLetterCount,
            pendingCount,
            status: deadLetterCount ? 'attention' : 'ready',
          },
          schema: 'ready',
          status: 'ready',
        },
      },
      { headers: RESPONSE_HEADERS },
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
