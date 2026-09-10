import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  customerConsentCurrentPosture,
  customerConsentPolicyEvidence,
  customerConsentPurpose,
  customerConsentSource,
  customerConsentStatus,
} from '@/services/customerConsentCenterService';

const MAX_PROPERTIES = 100;
const MAX_RECENT_RECORDS = 20;

export async function getPartnerPrivacyWorkspace(input: {
  memberRole?: string;
  partnerId: string;
  userId: string;
}) {
  const membership = await prisma.supplyPartnerMember.findFirst({
    select: { id: true },
    where: {
      partnerId: input.partnerId,
      partner: { status: 'ACTIVE' },
      userId: input.userId,
    },
  });
  if (!membership) return null;

  const storedProperties = await prisma.partnerProperty.findMany({
    orderBy: { displayName: 'asc' },
    select: { hotelSlug: true },
    take: MAX_PROPERTIES + 1,
    where: {
      listingSource: 'MANAGED',
      partnerId: input.partnerId,
      status: 'ACTIVE',
    },
  });
  const hotelSlugs = storedProperties
    .slice(0, MAX_PROPERTIES)
    .map((property) => property.hotelSlug);
  const [consentCount, consentRecords, privacyRequests, guestRegistrationCounts] =
    await Promise.all([
      prisma.userConsentRecord.count({ where: { userId: input.userId } }),
      prisma.userConsentRecord.findMany({
        orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
        select: {
          policyVersion: true,
          purpose: true,
          recordedAt: true,
          source: true,
          status: true,
          withdrawnAt: true,
        },
        take: MAX_RECENT_RECORDS,
        where: { userId: input.userId },
      }),
      prisma.dataPrivacyRequest.findMany({
        orderBy: { requestedAt: 'desc' },
        select: {
          dueAt: true,
          id: true,
          requestType: true,
          requestedAt: true,
          resolutionNote: true,
          status: true,
        },
        take: MAX_RECENT_RECORDS,
        where: { userId: input.userId },
      }),
      hotelSlugs.length
        ? Promise.all([
            prisma.hotelGuestRegistration.count({
              where: { booking: { hotelSlug: { in: hotelSlugs } } },
            }),
            prisma.hotelGuestRegistration.count({
              where: {
                booking: { hotelSlug: { in: hotelSlugs } },
                consentRecorded: true,
              },
            }),
          ])
        : Promise.resolve([0, 0] as const),
    ]);
  const latestMarketingConsent = consentRecords.find(
    (record) => record.purpose === 'MARKETING_COMMUNICATIONS',
  );
  const currentMarketingPosture = customerConsentCurrentPosture(latestMarketingConsent ?? null);
  let partnerRequests: Array<{
    dueAt: string;
    email: string;
    id: string;
    latestEvidence?: { note: string; posture: string; recordedAt: string };
    name: string;
    requestType: string;
    requestedAt: string;
    status: string;
  }> = [];
  if (input.memberRole === 'ADMIN' && hotelSlugs.length) {
    const guestRows = await prisma.bookingGuest.findMany({
      distinct: ['email'],
      select: { email: true },
      take: 5_000,
      where: { booking: { hotelSlug: { in: hotelSlugs } } },
    });
    const guestEmails = guestRows.map((guest) => guest.email.trim().toLowerCase()).filter(Boolean);
    const requests = guestEmails.length
      ? await prisma.dataPrivacyRequest.findMany({
          include: { user: { select: { email: true, firstName: true, lastName: true } } },
          orderBy: [{ dueAt: 'asc' }, { requestedAt: 'asc' }],
          take: MAX_RECENT_RECORDS,
          where: { status: { in: ['OPEN', 'IN_REVIEW'] }, user: { email: { in: guestEmails } } },
        })
      : [];
    const evidence = requests.length
      ? await prisma.partnerAuditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 100,
          where: {
            action: 'PARTNER_PRIVACY_EVIDENCE_RECORDED',
            entityId: { in: requests.map((request) => request.id) },
            entityType: 'DATA_PRIVACY_REQUEST',
            partnerId: input.partnerId,
          },
        })
      : [];
    partnerRequests = requests.map((request) => {
      const latest = evidence.find((entry) => entry.entityId === request.id);
      let latestEvidence: { note: string; posture: string; recordedAt: string } | undefined;
      if (latest) {
        try {
          const parsed = JSON.parse(latest.metadataJson) as { note?: unknown; posture?: unknown };
          if (typeof parsed.note === 'string' && typeof parsed.posture === 'string')
            latestEvidence = {
              note: parsed.note,
              posture: parsed.posture,
              recordedAt: latest.createdAt.toISOString(),
            };
        } catch {
          latestEvidence = undefined;
        }
      }
      return {
        dueAt: request.dueAt.toISOString(),
        email: request.user.email,
        id: request.id,
        latestEvidence,
        name: `${request.user.firstName} ${request.user.lastName}`.trim() || 'Guest account',
        requestType: request.requestType,
        requestedAt: request.requestedAt.toISOString(),
        status: request.status,
      };
    });
  }

  return {
    consentCount,
    consentHistoryLimited: consentCount > MAX_RECENT_RECORDS,
    consentRecords: consentRecords.map((record) => ({
      policy: customerConsentPolicyEvidence(record.policyVersion),
      purpose: customerConsentPurpose(record.purpose),
      recordedAt: record.recordedAt.toISOString(),
      source: customerConsentSource(record.source),
      status: customerConsentStatus(record.status),
      withdrawnAt: record.withdrawnAt?.toISOString(),
    })),
    currentMarketingPosture,
    guestRegistrationConsent: {
      recorded: guestRegistrationCounts[1],
      total: guestRegistrationCounts[0],
    },
    privacyRequests: privacyRequests.map((request) => ({
      ...request,
      dueAt: request.dueAt.toISOString(),
      requestedAt: request.requestedAt.toISOString(),
    })),
    partnerRequests,
    propertyLimitReached: storedProperties.length > MAX_PROPERTIES,
  } as const;
}
