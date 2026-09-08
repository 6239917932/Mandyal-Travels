import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerRoomOperationsWorkspace } from '@/services/partnerHousekeepingMaintenanceService';

export const metadata: Metadata = { title: 'Fixed assets | Mandyal PMS' };

export default async function PartnerFixedAssetsPage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partner');
  const workspace = await getPartnerRoomOperationsWorkspace(access.partnerId);
  const openRepairs = workspace.workOrders.filter((item) =>
    ['OPEN', 'IN_PROGRESS'].includes(item.status),
  );
  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Fixed assets · controlled foundation</p>
            <h1>Fixed-asset governance</h1>
            <p className="booking-page__intro">
              Review the property and maintenance evidence needed before an auditable capital-asset
              register can be activated.
            </p>
          </div>
          <Link className="ui-button ui-button--secondary" href="/partner/pms/maintenance">
            Maintenance
          </Link>
        </header>
        <div className="partner-bookings__summary">
          <Card>
            <span>Physical rooms</span>
            <strong>{workspace.rooms.length}</strong>
          </Card>
          <Card>
            <span>Open repair evidence</span>
            <strong>{openRepairs.length}</strong>
          </Card>
          <Card>
            <span>Asset register</span>
            <strong>Controlled</strong>
          </Card>
          <Card>
            <span>Depreciation posting</span>
            <strong>Not released</strong>
          </Card>
        </div>
        <Card>
          <p className="hotel-page__eyebrow">Activation checklist</p>
          <h2>Evidence required before asset capitalization</h2>
          <ul className="pms-module-workspace__checklist">
            <li>Approved asset policy, capitalization threshold, and depreciation method</li>
            <li>Verified invoice, ownership, property location, custodian, and unique asset tag</li>
            <li>Opening balances reconciled with counsel-approved books and tax treatment</li>
            <li>Physical verification procedure with immutable audit history</li>
          </ul>
        </Card>
        <Card>
          <p>
            This foundation intentionally does not treat room repairs or consumable stock as fixed
            assets and does not calculate depreciation without an approved accounting policy.
          </p>
        </Card>
      </div>
    </main>
  );
}
