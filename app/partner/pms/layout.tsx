import type { ReactNode } from 'react';

import { requirePartnerType } from '@/lib/partnerRouteGuard';

export default async function PmsLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requirePartnerType('HOTEL');
  return children;
}
