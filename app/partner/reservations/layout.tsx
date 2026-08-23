import type { ReactNode } from 'react';
import { requirePartnerType } from '@/lib/partnerRouteGuard';
export default async function ReservationsLayout({ children }: { children: ReactNode }) {
  await requirePartnerType('CAR');
  return children;
}
