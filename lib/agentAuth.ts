import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { prisma } from '@/lib/prisma';

export async function getAgencyAdminAccess() {
  const access = await getBusinessAdminMembership();
  if (!access) return null;

  const organization = await prisma.organization.findFirst({
    select: {
      approvalRequired: true,
      defaultCabinClass: true,
      id: true,
      maximumTripAmount: true,
      name: true,
    },
    where: { id: access.membership.organizationId, type: 'TRAVEL_AGENCY' },
  });

  return organization ? { ...access, organization } : null;
}
