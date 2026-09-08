import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerBookingEngineReadiness } from '@/services/partnerBookingEngineService';

export const metadata: Metadata = { title: 'Booking engine | Mandyal PMS' };

export default async function PartnerBookingEnginePage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partner');
  const workspace = await getPartnerBookingEngineReadiness(access.partnerId);
  const readyProperties = workspace.properties.filter(
    (property) => property.readiness.ready,
  ).length;
  const paymentReady =
    workspace.customerFlow.paymentEnabled && workspace.customerFlow.paymentConfigured;

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Revenue · one customer booking source</p>
            <h1>Booking engine</h1>
            <p className="booking-page__intro">
              Review whether each managed property can safely enter the existing public hotel
              search, quote, booking, and hosted-payment flow. This workspace does not create a
              second reservation system.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner/properties">
              Property settings
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/inventory">
              Rates and inventory
            </Link>
          </div>
        </header>

        {workspace.safetyLimitReached ? (
          <p className="booking-page__payment-error" role="alert">
            Display safety limit reached. Some properties are not shown; ask the platform
            administrator for a bounded export before making a release decision.
          </p>
        ) : null}

        <div className="partner-bookings__summary" aria-label="Booking engine summary">
          <Card>
            <span>Managed properties</span>
            <strong>{workspace.properties.length}</strong>
            <small>Bounded to this supplier workspace</small>
          </Card>
          <Card>
            <span>Ready for public discovery</span>
            <strong>{readyProperties}</strong>
            <small>All property and platform gates satisfied</small>
          </Card>
          <Card>
            <span>Public listings</span>
            <strong>{workspace.publicListingsEnabled ? 'Enabled' : 'Controlled'}</strong>
            <small>Administrator release gate</small>
          </Card>
          <Card>
            <span>Hosted payments</span>
            <strong>{paymentReady ? 'Ready' : 'Not released'}</strong>
            <small>
              {workspace.customerFlow.paymentConfigured
                ? 'Provider configuration detected'
                : 'Provider credentials still required'}
            </small>
          </Card>
        </div>

        <Card>
          <p className="hotel-page__eyebrow">Authoritative customer journey</p>
          <h2>Existing booking flow</h2>
          <p>
            Hotel search → live availability and quote → one reservation record → secure hosted
            payment → confirmation and servicing. Payment collection remains unavailable until both
            the provider configuration and the administrator release gate are active.
          </p>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href={workspace.customerFlow.search}>
              Open hotel search
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/bookings">
              Reservation desk
            </Link>
          </div>
        </Card>

        <div className="partner-bookings__list">
          {workspace.properties.map((property) => (
            <Card className="partner-bookings__booking" key={property.id}>
              <div className="booking-confirmation__reference">
                <span>
                  {property.readiness.readyChecks} of {property.readiness.totalChecks} release
                  checks complete
                </span>
                <strong>{property.name}</strong>
              </div>
              <ul className="pms-room-rack__queue-list">
                {property.readiness.checks.map((check) => (
                  <li key={check.label}>
                    <strong>
                      {check.ready ? 'Ready' : 'Action required'} · {check.label}
                    </strong>
                    <span>{check.message}</span>
                  </li>
                ))}
              </ul>
              <div className="manage-booking__document-actions">
                <Link className="ui-button ui-button--secondary" href="/partner/properties">
                  Review property setup
                </Link>
                {property.readiness.ready ? (
                  <Link className="ui-button ui-button--primary" href={property.previewHref}>
                    Open public listing
                  </Link>
                ) : null}
              </div>
            </Card>
          ))}
          {!workspace.properties.length ? (
            <Card>
              <h2>No managed hotel property</h2>
              <p>Create a property, room type, and rate plan before reviewing booking readiness.</p>
              <Link className="ui-button ui-button--primary" href="/partner/properties">
                Open property settings
              </Link>
            </Card>
          ) : null}
        </div>
      </div>
    </main>
  );
}
