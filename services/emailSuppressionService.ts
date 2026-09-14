import 'server-only';

import {
  emailEventPayloadHash,
  emailRecipientHash,
  type EmailProviderEventInput,
} from '@/lib/notifications/emailSuppression';
import { prisma } from '@/lib/prisma';
import { hasPrismaErrorCode } from '@/lib/prismaErrors';

function suppressionHashSecret(): string {
  return process.env.EMAIL_SUPPRESSION_HASH_SECRET?.trim() ?? '';
}

export async function isEmailRecipientSuppressed(recipient: string): Promise<boolean> {
  const recipientHash = emailRecipientHash(recipient, suppressionHashSecret());
  return Boolean(
    await prisma.emailSuppression.findUnique({
      where: { recipientHash },
      select: { id: true },
    }),
  );
}

export async function recordEmailProviderEvent(input: {
  event: EmailProviderEventInput;
  payload: string;
  provider: string;
}): Promise<{ duplicate: boolean }> {
  const recipientHash = emailRecipientHash(input.event.recipient, suppressionHashSecret());
  const recipientDomain = input.event.recipient.slice(input.event.recipient.lastIndexOf('@') + 1);

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.emailProviderEvent.create({
        data: {
          eventType: input.event.eventType,
          occurredAt: input.event.occurredAt,
          payloadHash: emailEventPayloadHash(input.payload),
          provider: input.provider,
          providerEventId: input.event.eventId,
          providerMessageId: input.event.providerMessageId,
          recipientHash,
        },
      });
      await transaction.emailSuppression.upsert({
        where: { recipientHash },
        create: {
          eventCount: 1,
          firstObservedAt: input.event.occurredAt,
          lastObservedAt: input.event.occurredAt,
          reason: input.event.eventType,
          recipientDomain,
          recipientHash,
          source: input.provider,
        },
        update: {
          eventCount: { increment: 1 },
          lastObservedAt: input.event.occurredAt,
          reason: input.event.eventType,
          source: input.provider,
        },
      });
    });
    return { duplicate: false };
  } catch (error) {
    if (hasPrismaErrorCode(error, 'P2002')) return { duplicate: true };
    throw error;
  }
}
