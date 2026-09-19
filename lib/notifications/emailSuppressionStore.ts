import type { PrismaClient } from '../../generated/prisma/client.ts';
import { hasPrismaErrorCode } from '../prismaErrors.ts';
import {
  emailEventPayloadHash,
  emailRecipientHash,
  type EmailProviderEventInput,
} from './emailSuppression.ts';

export async function storeEmailProviderEvent(
  database: PrismaClient,
  input: {
    event: EmailProviderEventInput;
    hashSecret: string;
    payload: string;
    provider: string;
  },
): Promise<{ duplicate: boolean }> {
  const recipientHash = emailRecipientHash(input.event.recipient, input.hashSecret);
  const recipientDomain = input.event.recipient.slice(input.event.recipient.lastIndexOf('@') + 1);
  const payloadHash = emailEventPayloadHash(input.payload);

  try {
    await database.$transaction(async (transaction) => {
      await transaction.emailProviderEvent.create({
        data: {
          eventType: input.event.eventType,
          occurredAt: input.event.occurredAt,
          payloadHash,
          provider: input.provider,
          providerEventId: input.event.eventId,
          providerMessageId: input.event.providerMessageId,
          recipientHash,
        },
      });
      await transaction.emailSuppression.upsert({
        where: { recipientHash },
        create: {
          firstObservedAt: input.event.occurredAt,
          lastObservedAt: input.event.occurredAt,
          reason: input.event.eventType,
          recipientDomain,
          recipientHash,
          source: input.provider,
        },
        update: { eventCount: { increment: 1 } },
      });
      // Delayed events must not move the audit window backwards or erase a complaint.
      await transaction.emailSuppression.updateMany({
        where: { recipientHash, firstObservedAt: { gt: input.event.occurredAt } },
        data: { firstObservedAt: input.event.occurredAt },
      });
      await transaction.emailSuppression.updateMany({
        where: { recipientHash, lastObservedAt: { lt: input.event.occurredAt } },
        data: { lastObservedAt: input.event.occurredAt },
      });
      if (input.event.eventType === 'COMPLAINT') {
        await transaction.emailSuppression.updateMany({
          where: { recipientHash },
          data: { reason: 'COMPLAINT' },
        });
      }
    });
    return { duplicate: false };
  } catch (error) {
    if (hasPrismaErrorCode(error, 'P2002')) {
      const existing = await database.emailProviderEvent.findUnique({
        where: {
          provider_providerEventId: {
            provider: input.provider,
            providerEventId: input.event.eventId,
          },
        },
        select: { payloadHash: true },
      });
      if (existing) {
        if (existing.payloadHash !== payloadHash) throw new Error('EMAIL_EVENT_ID_CONFLICT');
        return { duplicate: true };
      }
    }
    // An unrelated uniqueness race must be retried; acknowledging it would lose the event.
    throw error;
  }
}
