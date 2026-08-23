import type { ReactNode } from 'react';
import { requirePartnerType } from '@/lib/partnerRouteGuard';
export default async function AmendmentsLayout({ children }: { children: ReactNode }) {
  await requirePartnerType('HOTEL');
  return children;
}
