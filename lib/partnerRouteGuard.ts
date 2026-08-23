import { redirect } from 'next/navigation';

import { getPartnerAccess } from '@/lib/partnerAuth';

export async function requirePartnerType(expectedType: 'BUS' | 'CAR' | 'FLIGHT' | 'HOTEL') {
  const access = await getPartnerAccess();
  if (!access?.partnerId) redirect('/login?returnTo=/partner');
  if (access.partnerType !== expectedType) {
    redirect(`/partner/unauthorized?required=${expectedType.toLowerCase()}`);
  }
  return access;
}
