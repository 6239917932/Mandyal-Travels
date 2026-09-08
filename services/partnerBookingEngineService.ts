import 'server-only';

import { prisma } from '@/lib/prisma';
import { assessBookingEngineReadiness } from '@/lib/pms/bookingEngineReadiness';
import { isPlatformFeatureEnabled } from '@/services/platformFeatureFlagService';

const MAX_PROPERTIES = 100;

function present(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function hasConfiguredPaymentProvider(environment: NodeJS.ProcessEnv = process.env) {
  const required = [
    'PAYMENT_PROVIDER_ALLOWED_HOSTS',
    'PAYU_CLIENT_ID',
    'PAYU_CLIENT_SECRET',
    'PAYU_MERCHANT_ID',
    'PAYU_MERCHANT_KEY',
    'PAYU_MERCHANT_SALT',
    'PAYU_OAUTH_ENDPOINT',
    'PAYU_PAYMENT_LINK_ENDPOINT',
  ];
  return required.every((name) => {
    const value = environment[name]?.trim() ?? '';
    return value.length > 0 && !/change-me|changeme|example|replace-with|your-/i.test(value);
  });
}

export async function getPartnerBookingEngineReadiness(partnerId: string) {
  const [publicListingsEnabled, livePaymentsEnabled, partner, properties] = await Promise.all([
    isPlatformFeatureEnabled('PUBLIC_PARTNER_LISTINGS'),
    isPlatformFeatureEnabled('LIVE_MARKETPLACE_PAYMENTS'),
    prisma.supplyPartner.findUnique({
      include: {
        applications: {
          select: { id: true },
          take: 1,
          where: { kycStatus: 'VERIFIED', status: 'APPROVED' },
        },
        taxProfile: true,
      },
      where: { id: partnerId },
    }),
    prisma.partnerProperty.findMany({
      include: {
        rooms: {
          include: {
            ratePlans: { select: { id: true, status: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: MAX_PROPERTIES + 1,
      where: { listingSource: 'MANAGED', partnerId },
    }),
  ]);
  const boundedProperties = properties.slice(0, MAX_PROPERTIES);
  const taxProfileReady = Boolean(
    partner?.taxProfile?.reviewStatus === 'VERIFIED' &&
    ['REGISTERED', 'UNREGISTERED'].includes(partner.taxProfile.gstRegistrationStatus),
  );

  return {
    customerFlow: {
      booking: '/api/v1/hotels/bookings',
      paymentConfigured: hasConfiguredPaymentProvider(),
      paymentEnabled: livePaymentsEnabled,
      quote: '/api/v1/hotels/quotes',
      search: '/hotels',
    },
    properties: boundedProperties.map((property) => {
      const activeRooms = property.rooms.filter((room) => room.status === 'ACTIVE');
      const activeRatePlans = activeRooms.flatMap((room) =>
        room.ratePlans.filter((plan) => plan.status === 'ACTIVE'),
      );
      return {
        id: property.id,
        name: property.displayName,
        previewHref: `/hotels/${property.hotelSlug}`,
        readiness: assessBookingEngineReadiness({
          activeRatePlans: activeRatePlans.length,
          activeRoomTypes: activeRooms.length,
          approvalStatus: property.approvalStatus,
          commissionBasisPoints: partner?.commissionBasisPoints ?? 0,
          hasApprovedApplication: Boolean(partner?.applications.length),
          hasContactDetails: present(property.contactEmail) && present(property.contactPhone),
          hasDescription: present(property.description),
          hasLocation:
            present(property.city) &&
            present(property.country) &&
            Number.isFinite(property.latitude) &&
            Number.isFinite(property.longitude) &&
            !(property.latitude === 0 && property.longitude === 0),
          hasMedia: present(property.imageUrl),
          inventoryCount: activeRooms.reduce(
            (total, room) => total + Math.max(0, room.inventoryCount),
            0,
          ),
          partnerActive: partner?.status === 'ACTIVE',
          publicationStatus: property.publicationStatus,
          publicListingsEnabled,
          status: property.status,
          taxProfileReady,
        }),
      };
    }),
    publicListingsEnabled,
    safetyLimitReached: properties.length > MAX_PROPERTIES,
  } as const;
}
