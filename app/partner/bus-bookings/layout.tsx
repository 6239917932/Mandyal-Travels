import type { ReactNode } from 'react';
import { requirePartnerType } from '@/lib/partnerRouteGuard';
export default async function BusBookingsLayout({ children }: { children: ReactNode }) {
  await requirePartnerType('BUS');
  return children;
}
