import { prisma } from '@/lib/prisma';

type NotificationVariables = Readonly<Record<string, string | number | boolean | null>>;

export interface EnqueueNotificationInput {
  templateKey: string;
  recipient: string;
  dedupeKey: string;
  userId?: string;
  variables?: NotificationVariables;
}

function serializeVariables(variables: NotificationVariables | undefined): string {
  const serialized = JSON.stringify(variables ?? {});
  if (serialized.length > 5_000) {
    throw new Error('Notification variables exceed the 5,000-character limit.');
  }
  return serialized;
}

export async function enqueueNotification(input: EnqueueNotificationInput) {
  const recipient = input.recipient.trim();
  const dedupeKey = input.dedupeKey.trim();
  if (recipient.length < 3 || recipient.length > 320) {
    throw new Error('Notification recipient is invalid.');
  }
  if (dedupeKey.length < 8 || dedupeKey.length > 160) {
    throw new Error('Notification dedupe key is invalid.');
  }

  const template = await prisma.notificationTemplate.findUnique({
    where: { templateKey: input.templateKey.trim() },
  });
  if (!template || template.status !== 'ACTIVE') {
    throw new Error('The requested notification template is not active.');
  }

  return prisma.notificationDelivery.upsert({
    where: { dedupeKey },
    create: {
      templateId: template.id,
      userId: input.userId,
      recipient,
      channel: template.channel,
      dedupeKey,
      variablesJson: serializeVariables(input.variables),
    },
    update: {},
    include: { template: true },
  });
}
