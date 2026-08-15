import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export type PersistedTravelProduct = 'FLIGHT' | 'BUS' | 'CAR';

export async function hasOwnedTravelConfirmation(
  confirmationCode: string | undefined,
  productType: PersistedTravelProduct,
): Promise<boolean> {
  if (!confirmationCode || !/^M[BCF][A-Z0-9]{8,20}$/.test(confirmationCode)) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  const trip = await prisma.customerTrip.findFirst({
    select: { id: true },
    where: { confirmationCode, productType, userId: user.id },
  });
  return trip !== null;
}
