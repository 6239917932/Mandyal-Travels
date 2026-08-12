import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PartnerFleetManager } from '@/components/partner/PartnerFleetManager';
import { getPartnerAccess } from '@/lib/partnerAuth';

export const metadata: Metadata = { title: 'Fleet operations' };
export default async function PartnerFleetPage() {
  const access = await getPartnerAccess();
  if (!access) redirect('/login?returnTo=/partner/fleet');
  if (access.partnerType !== 'CAR') redirect('/partner');
  return (
    <section className="account-page">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Car supplier operations</p>
          <h1>Fleet and availability center</h1>
          <p>
            Add vehicles, publish operating locations, set daily prices, and stop sales for
            maintenance or allocation.
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/partner">
          Supplier workspace
        </Link>
      </div>
      <PartnerFleetManager canCreateVehicles={access.memberRole === 'ADMIN'} />
    </section>
  );
}
