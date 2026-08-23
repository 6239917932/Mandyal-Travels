import type { ReactNode } from 'react';
import { requirePartnerType } from '@/lib/partnerRouteGuard';
export default async function PropertiesLayout({ children }: { children: ReactNode }) {
  await requirePartnerType('HOTEL');
  return children;
}
