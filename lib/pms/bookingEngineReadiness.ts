export type BookingEngineReadinessInput = Readonly<{
  activeRatePlans: number;
  activeRoomTypes: number;
  approvalStatus: string;
  commissionBasisPoints: number;
  hasApprovedApplication: boolean;
  hasContactDetails: boolean;
  hasDescription: boolean;
  hasLocation: boolean;
  hasMedia: boolean;
  inventoryCount: number;
  partnerActive: boolean;
  publicationStatus: string;
  publicListingsEnabled: boolean;
  status: string;
  taxProfileReady: boolean;
}>;

export type BookingEngineCheck = Readonly<{
  label: string;
  message: string;
  ready: boolean;
}>;

export function assessBookingEngineReadiness(input: BookingEngineReadinessInput) {
  const checks: BookingEngineCheck[] = [
    {
      label: 'Supplier approval',
      message: input.hasApprovedApplication
        ? 'Approved supplier application is on record.'
        : 'Platform approval and verified supplier application are required.',
      ready: input.hasApprovedApplication && input.partnerActive,
    },
    {
      label: 'Tax and commission',
      message:
        input.taxProfileReady && input.commissionBasisPoints === 2_000
          ? 'Verified tax classification and the governed marketplace commission are recorded.'
          : 'Complete administrator-reviewed tax classification and commission setup.',
      ready: input.taxProfileReady && input.commissionBasisPoints === 2_000,
    },
    {
      label: 'Public content',
      message:
        input.hasDescription && input.hasLocation && input.hasMedia && input.hasContactDetails
          ? 'Description, location, media, and contact details are present.'
          : 'Complete the public description, location, media, and contact details.',
      ready: input.hasDescription && input.hasLocation && input.hasMedia && input.hasContactDetails,
    },
    {
      label: 'Rooms and rates',
      message:
        input.activeRoomTypes > 0 && input.activeRatePlans > 0 && input.inventoryCount > 0
          ? `${input.activeRoomTypes} active room type(s), ${input.activeRatePlans} active rate plan(s), and ${input.inventoryCount} room(s) are configured.`
          : 'Add an active room type, sellable inventory, and an active rate plan.',
      ready: input.activeRoomTypes > 0 && input.activeRatePlans > 0 && input.inventoryCount > 0,
    },
    {
      label: 'Listing review',
      message:
        input.approvalStatus === 'APPROVED'
          ? 'The property listing has administrator approval.'
          : `Property review status is ${input.approvalStatus.toLowerCase().replaceAll('_', ' ')}.`,
      ready: input.approvalStatus === 'APPROVED',
    },
    {
      label: 'Marketplace release',
      message: input.publicListingsEnabled
        ? 'Public partner listings are enabled by the platform administrator.'
        : 'Public partner listings remain under the platform release gate.',
      ready: input.publicListingsEnabled,
    },
    {
      label: 'Published and active',
      message:
        input.publicationStatus === 'PUBLISHED' && input.status === 'ACTIVE'
          ? 'The property is active and published to hotel search.'
          : 'Publish the approved property when every release gate is satisfied.',
      ready: input.publicationStatus === 'PUBLISHED' && input.status === 'ACTIVE',
    },
  ];

  return {
    checks,
    ready: checks.every((check) => check.ready),
    readyChecks: checks.filter((check) => check.ready).length,
    totalChecks: checks.length,
  } as const;
}
