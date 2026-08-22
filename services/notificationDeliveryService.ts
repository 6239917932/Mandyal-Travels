import 'server-only';

import {
  htmlToNotificationText,
  notificationRetryDecision,
  parseNotificationVariables,
  renderNotificationTemplate,
  sanitizeDeliveryError,
} from '@/lib/notifications/delivery';
import { prisma } from '@/lib/prisma';
import { sendTransactionalEmail } from '@/services/emailProviderService';
import { sendMobileMessage } from '@/services/mobileMessagingProviderService';
import { sendPushNotification } from '@/services/pushProviderService';

const DEFAULT_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 100;
const PROCESSING_LEASE_MS = 15 * 60_000;

export interface NotificationDeliverySummary {
  deadLettered: number;
  delivered: number;
  failed: number;
}

function boundedBatchSize(value: number): number {
  if (!Number.isInteger(value)) return DEFAULT_BATCH_SIZE;
  return Math.max(1, Math.min(value, MAX_BATCH_SIZE));
}

async function sendDelivery(input: {
  channel: string;
  dedupeKey: string;
  recipient: string;
  subject: string;
  body: string;
  templateKey: string;
  variablesJson: string;
}): Promise<string> {
  const variables = parseNotificationVariables(input.variablesJson);
  const subject = renderNotificationTemplate(input.subject, variables);
  const plainBody = renderNotificationTemplate(input.body, variables);

  if (input.channel === 'EMAIL') {
    const html = renderNotificationTemplate(input.body, variables, { escapeValues: true });
    const result = await sendTransactionalEmail({
      dedupeKey: input.dedupeKey,
      html,
      subject,
      text: htmlToNotificationText(plainBody),
      to: input.recipient,
    });
    return result.providerMessageId;
  }

  if (input.channel === 'SMS' || input.channel === 'WHATSAPP') {
    const result = await sendMobileMessage({
      channel: input.channel,
      dedupeKey: input.dedupeKey,
      recipient: input.recipient,
      templateId: input.templateKey,
      text: plainBody,
    });
    return result.providerMessageId;
  }

  if (input.channel === 'PUSH') {
    const deepLink = variables.deepLink;
    const result = await sendPushNotification({
      body: plainBody,
      dedupeKey: input.dedupeKey,
      deviceToken: input.recipient,
      title: subject || input.templateKey,
      ...(typeof deepLink === 'string' ? { deepLink } : {}),
    });
    return result.providerMessageId;
  }

  throw new Error('NOTIFICATION_CHANNEL_UNSUPPORTED');
}

export async function deliverPendingNotifications(
  requestedBatchSize = DEFAULT_BATCH_SIZE,
): Promise<NotificationDeliverySummary> {
  const batchSize = boundedBatchSize(requestedBatchSize);
  const now = new Date();
  const leaseExpiredAt = new Date(now.getTime() - PROCESSING_LEASE_MS);

  await prisma.notificationDelivery.updateMany({
    where: { status: 'PROCESSING', updatedAt: { lt: leaseExpiredAt } },
    data: {
      lastError: 'WORKER_LEASE_EXPIRED',
      nextAttemptAt: now,
      status: 'QUEUED',
    },
  });

  const candidates = await prisma.notificationDelivery.findMany({
    where: { status: 'QUEUED', nextAttemptAt: { lte: now } },
    include: { template: true },
    orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }],
    take: batchSize,
  });

  const summary: NotificationDeliverySummary = { deadLettered: 0, delivered: 0, failed: 0 };
  for (const delivery of candidates) {
    const claim = await prisma.notificationDelivery.updateMany({
      where: { id: delivery.id, status: 'QUEUED', updatedAt: delivery.updatedAt },
      data: { status: 'PROCESSING' },
    });
    if (claim.count !== 1) continue;

    try {
      const providerRef = await sendDelivery({
        body: delivery.template.body,
        channel: delivery.channel,
        dedupeKey: delivery.dedupeKey,
        recipient: delivery.recipient,
        subject: delivery.template.subject,
        templateKey: delivery.template.templateKey,
        variablesJson: delivery.variablesJson,
      });
      await prisma.notificationDelivery.updateMany({
        where: { id: delivery.id, status: 'PROCESSING' },
        data: {
          attempts: { increment: 1 },
          deliveredAt: new Date(),
          lastError: '',
          providerRef,
          status: 'DELIVERED',
        },
      });
      summary.delivered += 1;
    } catch (error) {
      const decision = notificationRetryDecision({
        attempts: delivery.attempts,
        maxAttempts: delivery.maxAttempts,
      });
      await prisma.notificationDelivery.updateMany({
        where: { id: delivery.id, status: 'PROCESSING' },
        data: {
          attempts: decision.attempts,
          lastError: sanitizeDeliveryError(error),
          nextAttemptAt: decision.nextAttemptAt,
          status: decision.status,
        },
      });
      summary.failed += 1;
      if (decision.status === 'DEAD_LETTER') summary.deadLettered += 1;
    }
  }

  return summary;
}
