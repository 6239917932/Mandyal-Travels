import type { Prisma } from '@/generated/prisma/client';

export function buildBusinessCheckoutAccessWhere(
  requestId: string,
  userId: string,
): Prisma.BusinessTravelRequestWhereInput {
  return {
    id: requestId,
    OR: [
      { requesterId: userId },
      {
        agencyCustomerLink: { isNot: null },
        organization: {
          is: {
            members: { some: { role: 'ADMIN', userId } },
            type: 'TRAVEL_AGENCY',
          },
        },
      },
    ],
  };
}
