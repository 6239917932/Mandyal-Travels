import type { ReactNode } from 'react';
import { requirePartnerType } from '@/lib/partnerRouteGuard';
export default async function FlightsLayout({ children }: { children: ReactNode }) {
  await requirePartnerType('FLIGHT');
  return children;
}
