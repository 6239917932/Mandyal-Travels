import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { WorkspaceShell, type WorkspaceNavigationGroup } from '@/components/layout/WorkspaceShell';
import { getCurrentUser } from '@/lib/auth/session';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPmsModuleHref, pmsModuleGroups, pmsModules } from '@/lib/pms/moduleRegistry';

type PartnerLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function PartnerLayout({ children }: PartnerLayoutProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/partner');

  const access = await getPartnerAccess();
  if (!access?.partnerId || !access.userId) redirect('/partners/apply');

  const hotelGroups: readonly WorkspaceNavigationGroup[] = [
    {
      label: 'Partner workspace',
      items: [
        { code: 'PW', href: '/partner', label: 'Partner dashboard' },
        { code: 'CP', href: '/partner/compliance', label: 'Compliance' },
        { code: 'TX', href: '/partner/tax', label: 'Tax and billing' },
        { code: 'ST', href: '/partner/settlements', label: 'Settlements' },
        { code: 'RV', href: '/partner/reviews', label: 'Guest reviews' },
        { code: 'AC', href: '/partner/activity', label: 'Activity and access' },
      ],
    },
    ...pmsModuleGroups.map((group) => ({
      label: group,
      items: pmsModules
        .filter((module) => module.group === group)
        .map((module) => ({
          code: module.code,
          href: getPmsModuleHref(module),
          label: module.name === 'Dashboard' ? 'PMS dashboard' : module.name,
          note:
            module.status === 'LIVE'
              ? undefined
              : `Phase ${module.phase} · ${module.status.toLowerCase()}`,
        })),
    })),
  ];
  const transportGroups: readonly WorkspaceNavigationGroup[] = [
    {
      label: 'Partner workspace',
      items: [
        { code: 'DB', href: '/partner', label: 'Dashboard' },
        ...(access.partnerType === 'CAR'
          ? [
              { code: 'FL', href: '/partner/fleet', label: 'Fleet' },
              { code: 'RS', href: '/partner/reservations', label: 'Reservations' },
            ]
          : access.partnerType === 'BUS'
            ? [
                { code: 'BO', href: '/partner/bus-operations', label: 'Bus operations' },
                { code: 'BR', href: '/partner/bus-bookings', label: 'Bus bookings' },
              ]
            : [{ code: 'FL', href: '/partner/flights', label: 'Flight operations' }]),
        { code: 'RP', href: '/partner/reports', label: 'Reports' },
        { code: 'CP', href: '/partner/compliance', label: 'Compliance' },
        { code: 'TX', href: '/partner/tax', label: 'Tax and billing' },
        { code: 'ST', href: '/partner/settlements', label: 'Settlements' },
        { code: 'AC', href: '/partner/activity', label: 'Activity and access' },
      ],
    },
  ];

  return (
    <WorkspaceShell
      groups={access.partnerType === 'HOTEL' ? hotelGroups : transportGroups}
      identity={user.email}
      subtitle={`${access.partnerType ?? 'Supplier'} operations`}
      title={access.partnerName ?? 'Mandyal Partner'}
    >
      {children}
    </WorkspaceShell>
  );
}
