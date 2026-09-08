import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerCentralReservations } from '@/services/partnerCentralReservationsService';

export const metadata: Metadata = { title: 'Telephone and EPABX | Mandyal PMS' };

export default async function PartnerTelephonePage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partner');
  const workspace = await getPartnerCentralReservations(access.partnerId);
  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Communications · controlled foundation</p>
            <h1>Telephone and EPABX</h1>
            <p className="booking-page__intro">
              Use live in-house occupancy as the authoritative room context while telephony
              credentials and device mappings remain disabled.
            </p>
          </div>
          <Link className="ui-button ui-button--secondary" href="/partner/pms/central-reservations">
            Reservations
          </Link>
        </header>
        <div className="partner-bookings__summary">
          <Card>
            <span>In-house rooms</span>
            <strong>{workspace.totals.inHouse}</strong>
          </Card>
          <Card>
            <span>Managed properties</span>
            <strong>{workspace.summaries.length}</strong>
          </Card>
          <Card>
            <span>EPABX connection</span>
            <strong>Not configured</strong>
          </Card>
          <Card>
            <span>Automatic call charges</span>
            <strong>Blocked</strong>
          </Card>
        </div>
        <Card>
          <p className="hotel-page__eyebrow">Release gates</p>
          <h2>Required before live telephone operations</h2>
          <ul className="pms-module-workspace__checklist">
            <li>Contracted PBX provider and verified property extension map</li>
            <li>Authenticated event delivery with replay protection and health monitoring</li>
            <li>Guest-approved wake-up workflow and staff acknowledgement trail</li>
            <li>Tested tariff, tax, folio-posting, reversal, and dispute controls</li>
          </ul>
        </Card>
        <Card>
          <p>
            No call content, destination, wake-up request, or folio charge is fabricated or stored
            while the provider and operational policy are absent.
          </p>
        </Card>
      </div>
    </main>
  );
}
