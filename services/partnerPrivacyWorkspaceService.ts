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

export async function getPartnerPrivacyWorkspace(input: { partnerId: string; userId: string }) {
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
    propertyLimitReached: storedProperties.length > MAX_PROPERTIES,
  } as const;
}
