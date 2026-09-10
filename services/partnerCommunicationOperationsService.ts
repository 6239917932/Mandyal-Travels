import 'server-only';

import { createHash } from 'node:crypto';

import type { Prisma } from '@/generated/prisma/client';
import {
  isAllowedProviderEndpoint,
  parseAllowedProviderHosts,
} from '@/lib/integrations/providerEndpoint';
import { prisma } from '@/lib/prisma';

const MAX_AUDIENCE_RECORDS = 500;
const MAX_RECENT_DELIVERIES = 100;

function privateRecipientReference(channel: string, recipient: string) {
  return createHash('sha256')
    .update(`${channel.toUpperCase()}:${recipient.trim().toLowerCase()}`)
    .digest('hex')
    .slice(0, 12)
    .toUpperCase();
}

function emailProviderReady() {
  const from = process.env.EMAIL_FROM_ADDRESS?.trim() ?? '';
  const smtpHost = process.env.EMAIL_SMTP_HOST?.trim().toLowerCase() ?? '';
  const smtpUser = process.env.EMAIL_SMTP_USER?.trim() ?? '';
  const smtpPassword = process.env.EMAIL_SMTP_PASSWORD ?? '';
  const smtpPort = Number(process.env.EMAIL_SMTP_PORT ?? '465');
  const smtpAllowed = parseAllowedProviderHosts(process.env.EMAIL_SMTP_ALLOWED_HOSTS);
  const smtpReady =
    Boolean(from && smtpHost && smtpUser && smtpPassword) &&
    smtpPort === 465 &&
    smtpAllowed.includes(smtpHost);
  const endpoint = process.env.EMAIL_PROVIDER_ENDPOINT ?? '';
  const endpointReady =
    Boolean(from && process.env.EMAIL_PROVIDER_API_KEY) &&
    isAllowedProviderEndpoint(
      endpoint,
      parseAllowedProviderHosts(process.env.EMAIL_PROVIDER_ALLOWED_HOSTS),
    );
  return smtpReady || endpointReady;
}

function whatsappProviderReady() {
  return (
    Boolean(process.env.MOBILE_MESSAGING_API_KEY && process.env.WHATSAPP_SENDER) &&
    isAllowedProviderEndpoint(
      process.env.MOBILE_MESSAGING_ENDPOINT ?? '',
      parseAllowedProviderHosts(process.env.MOBILE_MESSAGING_ALLOWED_HOSTS),
    )
  );
}

export async function getPartnerCommunicationOperations(partnerId: string) {
  const [members, properties] = await Promise.all([
    prisma.supplyPartnerMember.findMany({
      select: { userId: true },
      take: MAX_AUDIENCE_RECORDS + 1,
      where: { partnerId },
    }),
    prisma.partnerProperty.findMany({
      select: { hotelSlug: true },
      take: MAX_AUDIENCE_RECORDS + 1,
      where: { partnerId },
    }),
  ]);
  const memberUserIds = members.slice(0, MAX_AUDIENCE_RECORDS).map((member) => member.userId);
  const hotelSlugs = properties
    .slice(0, MAX_AUDIENCE_RECORDS)
    .map((property) => property.hotelSlug);
  const bookingGuests = hotelSlugs.length
    ? await prisma.bookingGuest.findMany({
        distinct: ['email'],
        orderBy: { id: 'desc' },
        select: { email: true },
        take: MAX_AUDIENCE_RECORDS + 1,
        where: { booking: { hotelSlug: { in: hotelSlugs } } },
      })
    : [];
  const guestEmails = bookingGuests
    .slice(0, MAX_AUDIENCE_RECORDS)
    .map((guest) => guest.email.trim().toLowerCase())
    .filter(Boolean);
  const audienceWhere: Prisma.UserWhereInput = {
    OR: [
      ...(memberUserIds.length ? [{ id: { in: memberUserIds } }] : []),
      ...(guestEmails.length ? [{ email: { in: guestEmails } }] : []),
    ],
  };
  const deliveryWhere: Prisma.NotificationDeliveryWhereInput = {
    OR: [
      ...(memberUserIds.length ? [{ userId: { in: memberUserIds } }] : []),
      ...(guestEmails.length ? [{ recipient: { in: guestEmails } }] : []),
    ],
  };
  const hasAudience = memberUserIds.length > 0 || guestEmails.length > 0;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1_000);
  const [users, templates, deliveries, totalSevenDays, deliveredSevenDays, workerRun] =
    await Promise.all([
      hasAudience
        ? prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
              bookingEmailEnabled: true,
              consentRecords: {
                orderBy: { recordedAt: 'desc' },
                select: { purpose: true, recordedAt: true, status: true },
                take: 10,
              },
              id: true,
              whatsappAlertsEnabled: true,
            },
            take: MAX_AUDIENCE_RECORDS + 1,
            where: audienceWhere,
          })
        : Promise.resolve([]),
      prisma.notificationTemplate.findMany({
        orderBy: [{ channel: 'asc' }, { templateKey: 'asc' }],
        select: { channel: true, status: true, templateKey: true, version: true },
        take: 100,
        where: { channel: { in: ['EMAIL', 'WHATSAPP'] } },
      }),
      hasAudience
        ? prisma.notificationDelivery.findMany({
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            select: {
              attempts: true,
              channel: true,
              createdAt: true,
              deliveredAt: true,
              lastError: true,
              providerRef: true,
              recipient: true,
              status: true,
              template: { select: { templateKey: true } },
            },
            take: MAX_RECENT_DELIVERIES,
            where: deliveryWhere,
          })
        : Promise.resolve([]),
      hasAudience
        ? prisma.notificationDelivery.count({
            where: { AND: [deliveryWhere, { createdAt: { gte: sevenDaysAgo } }] },
          })
        : Promise.resolve(0),
      hasAudience
        ? prisma.notificationDelivery.count({
            where: {
              AND: [deliveryWhere, { createdAt: { gte: sevenDaysAgo }, status: 'DELIVERED' }],
            },
          })
        : Promise.resolve(0),
      prisma.automationJobRun.findFirst({
        orderBy: { startedAt: 'desc' },
        select: {
          completedAt: true,
          failureCount: true,
          processedCount: true,
          startedAt: true,
          status: true,
        },
        where: { jobKey: 'NOTIFICATION_DELIVERY_V1' },
      }),
    ]);

  const currentConsent = users.map((user) => {
    const latestByPurpose = new Map<string, (typeof user.consentRecords)[number]>();
    for (const record of user.consentRecords) {
      if (!latestByPurpose.has(record.purpose)) latestByPurpose.set(record.purpose, record);
    }
    return { latestByPurpose, user };
  });
  const emailEligible = currentConsent.filter(({ latestByPurpose, user }) => {
    const explicit = latestByPurpose.get('BOOKING_EMAIL');
    return user.bookingEmailEnabled && explicit?.status !== 'WITHDRAWN';
  }).length;
  const whatsappEligible = currentConsent.filter(({ latestByPurpose, user }) => {
    const explicit = latestByPurpose.get('WHATSAPP_ALERTS');
    return user.whatsappAlertsEnabled && explicit?.status !== 'WITHDRAWN';
  }).length;

  return {
    audience: {
      emailEligible,
      registered: users.slice(0, MAX_AUDIENCE_RECORDS).length,
      whatsappEligible,
    },
    deliveries: deliveries.map((delivery) => ({
      attempts: delivery.attempts,
      channel: delivery.channel,
      createdAt: delivery.createdAt,
      deliveredAt: delivery.deliveredAt,
      errorEvidenceRecorded: Boolean(delivery.lastError.trim()),
      providerAcknowledgementRecorded: Boolean(delivery.providerRef.trim()),
      recipientReference: privateRecipientReference(delivery.channel, delivery.recipient),
      status: delivery.status,
      templateKey: delivery.template.templateKey,
    })),
    provider: {
      emailReady: emailProviderReady(),
      whatsappReady: whatsappProviderReady(),
    },
    safetyLimitReached:
      members.length > MAX_AUDIENCE_RECORDS ||
      properties.length > MAX_AUDIENCE_RECORDS ||
      bookingGuests.length > MAX_AUDIENCE_RECORDS ||
      users.length > MAX_AUDIENCE_RECORDS,
    sevenDayDeliveryRate:
      totalSevenDays > 0 ? Math.round((deliveredSevenDays / totalSevenDays) * 100) : null,
    templates,
    workerRun,
  } as const;
}
