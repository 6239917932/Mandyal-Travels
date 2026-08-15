import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth/session';
import { getPartnerAccess } from '@/lib/partnerAuth';

type PartnerLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function PartnerLayout({ children }: PartnerLayoutProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/partner');

  const access = await getPartnerAccess();
  if (!access?.partnerId || !access.userId) redirect('/partners');

  return children;
}
