import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export async function getBusinessAdminMembership() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'BUSINESS_ADMIN') return null;

  const membership = await prisma.organizationMember.findFirst({
    select: { id: true, organizationId: true, userId: true },
    where: { role: 'ADMIN', userId: user.id },
  });

  return membership ? { membership, user } : null;
}
