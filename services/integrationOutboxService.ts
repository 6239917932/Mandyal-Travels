import { prisma } from '@/lib/prisma';
import { outboxRetryDecision, safeOutboxError } from '@/lib/integrations/outbox';

export type IntegrationEventEnvelope = {
  aggregateId: string;
  aggregateType: string;
  eventId: string;
  eventType: string;
  occurredAt: string;
  payload: unknown;
};

export interface IntegrationEventAdapter {
  deliver(event: IntegrationEventEnvelope): Promise<void>;
}

export const integrationOutboxService = {
  async deliverPending(
    adapter: IntegrationEventAdapter,
    batchSize = 25,
  ): Promise<{ delivered: number; failed: number }> {
    const boundedBatchSize = Math.max(1, Math.min(100, Math.trunc(batchSize)));
    const now = new Date();
    const expiredLease = new Date(now.getTime() - 15 * 60_000);
    await prisma.integrationOutboxEvent.updateMany({
      data: { lockedAt: null, status: 'PENDING' },
      where: { lockedAt: { lt: expiredLease }, status: 'PROCESSING' },
    });
    const events = await prisma.integrationOutboxEvent.findMany({
      orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }],
      take: boundedBatchSize,
      where: { nextAttemptAt: { lte: now }, status: 'PENDING' },
    });
    let delivered = 0;
    let failed = 0;

    for (const event of events) {
      const claimed = await prisma.integrationOutboxEvent.updateMany({
        data: { lockedAt: now, status: 'PROCESSING' },
        where: { id: event.id, status: 'PENDING' },
      });
      if (claimed.count !== 1) continue;
      try {
        await adapter.deliver({
          aggregateId: event.aggregateId,
          aggregateType: event.aggregateType,
          eventId: event.id,
          eventType: event.eventType,
          occurredAt: event.createdAt.toISOString(),
          payload: JSON.parse(event.payloadJson) as unknown,
        });
        await prisma.integrationOutboxEvent.update({
          data: {
            attempts: { increment: 1 },
            lastError: '',
            lockedAt: null,
            processedAt: new Date(),
            status: 'DELIVERED',
          },
          where: { id: event.id },
        });
        delivered += 1;
      } catch (error) {
        const retry = outboxRetryDecision({
          attempts: event.attempts,
          maxAttempts: event.maxAttempts,
          now: new Date(),
        });
        await prisma.integrationOutboxEvent.update({
          data: {
            attempts: { increment: 1 },
            lastError: safeOutboxError(error),
            lockedAt: null,
            nextAttemptAt: retry.nextAttemptAt,
            status: retry.status,
          },
          where: { id: event.id },
        });
        failed += 1;
      }
    }
    return { delivered, failed };
  },
};
