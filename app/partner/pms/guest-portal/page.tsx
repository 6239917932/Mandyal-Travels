import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerGuestCrmWorkspace } from '@/services/partnerGuestCrmService';

export const metadata: Metadata = { title: 'Guest portal | Mandyal PMS' };

export default async function PartnerGuestPortalPage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partner');
  const workspace = await getPartnerGuestCrmWorkspace({ partnerId: access.partnerId });
  const stays = workspace.profiles.reduce((total, profile) => total + profile.stayCount, 0);
  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Guest self-service · shared customer account</p>
            <h1>Guest portal</h1>
            <p className="booking-page__intro">
              Guests use the existing secure Mandyal account and booking pages, so this PMS does not
              create a second password, identity, or consent database.
            </p>
          </div>
          <Link className="ui-button ui-button--secondary" href="/account">
            Open customer portal
          </Link>
        </header>
        <div className="partner-bookings__summary">
          <Card>
            <span>Booking-derived profiles</span>
            <strong>{workspace.profiles.length}</strong>
          </Card>
          <Card>
            <span>Confirmed stays</span>
            <strong>{stays}</strong>
          </Card>
          <Card>
            <span>Separate guest database</span>
            <strong>None</strong>
          </Card>
          <Card>
            <span>Identity posture</span>
            <strong>Minimized</strong>
          </Card>
        </div>
        <Card>
          <p className="hotel-page__eyebrow">Available guest journeys</p>
          <h2>Secure self-service entry points</h2>
          <div className="pms-module-workspace__actions">
            <Link className="ui-button ui-button--secondary" href="/account/trips">
              Trips and stays
            </Link>
            <Link className="ui-button ui-button--secondary" href="/manage-booking">
              Manage a booking
            </Link>
            <Link className="ui-button ui-button--secondary" href="/account/support">
              Customer support
            </Link>
            <Link className="ui-button ui-button--secondary" href="/account/consents">
              Consent centre
            </Link>
          </div>
        </Card>
        <Card>
          <p>
            Pre-arrival data remains tied to a verified booking and authenticated customer. Supplier
            users see only the operational, privacy-minimized views already available in Guest CRM
            and Guest registration.
          </p>
        </Card>
      </div>
    </main>
  );
}
