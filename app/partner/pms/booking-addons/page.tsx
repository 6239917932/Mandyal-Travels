import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  BookingAddonCreateForm,
  BookingAddonStatusButton,
} from '@/components/partner/BookingAddonControls';
import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerBookingAddonWorkspace } from '@/services/partnerBookingAddonService';

export const metadata: Metadata = { title: 'Booking packages and add-ons | Mandyal PMS' };

function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { currency, style: 'currency' }).format(amount);
}

function label(value: string) {
  return value.toLowerCase().replaceAll('_', ' ');
}

export default async function BookingAddonsPage() {
  const access = await getPartnerAccess();
  if (
    !access?.partnerId ||
    !access.userId ||
    access.partnerType !== 'HOTEL' ||
    access.memberRole !== 'ADMIN'
  )
    redirect('/partner');
  const workspace = await getPartnerBookingAddonWorkspace(access.partnerId);
  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Revenue · guest choice</p>
            <h1>Booking packages and add-ons</h1>
            <p className="booking-page__intro">
              Offer breakfast, extra beds, transfers, wellness, and experiences with controlled
              dates, quantities, taxes, and an immutable price in every accepted quote.
            </p>
          </div>
          <Link className="ui-button ui-button--secondary" href="/partner/pms/booking-engine">
            Booking engine
          </Link>
        </header>

        {workspace.safetyLimitReached ? (
          <p className="booking-page__payment-error" role="alert">
            Display safety limit reached. Contact the platform administrator before adding more.
          </p>
        ) : null}

        <div className="partner-bookings__summary">
          <Card>
            <span>Published</span>
            <strong>{workspace.addons.filter((item) => item.status === 'ACTIVE').length}</strong>
          </Card>
          <Card>
            <span>Paused</span>
            <strong>{workspace.addons.filter((item) => item.status === 'PAUSED').length}</strong>
          </Card>
          <Card>
            <span>Properties</span>
            <strong>{workspace.properties.length}</strong>
          </Card>
          <Card>
            <span>Price snapshots</span>
            <strong>Immutable</strong>
          </Card>
        </div>

        <Card>
          <p className="hotel-page__eyebrow">Create an offer</p>
          <h2>Publish a package or add-on</h2>
          <p>
            New quotes use the current catalogue. Existing quotes and confirmed bookings retain the
            exact name, quantity, unit price, tax rate, and total originally accepted.
          </p>
          <BookingAddonCreateForm
            properties={workspace.properties.map((property) => ({
              id: property.id,
              name: property.displayName,
            }))}
          />
        </Card>

        <Card>
          <p className="hotel-page__eyebrow">Offer catalogue</p>
          <h2>Current packages and add-ons</h2>
          {workspace.addons.length ? (
            <div className="pms-room-rack__table-wrap">
              <table className="pms-room-rack__table">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Offer</th>
                    <th>Pricing</th>
                    <th>Availability</th>
                    <th>Status</th>
                    <th>Control</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.addons.map((addon) => (
                    <tr key={addon.id}>
                      <td>{addon.property.displayName}</td>
                      <th scope="row">
                        {addon.name}
                        <small>
                          {label(addon.category)} · {addon.description}
                        </small>
                      </th>
                      <td>
                        {money(addon.unitAmount, addon.currency)}
                        <small>
                          {label(addon.pricingMode)} · {(addon.taxRateBps / 100).toFixed(2)}% tax ·
                          qty {addon.minQuantity}–{addon.maxQuantity}
                        </small>
                      </td>
                      <td>
                        {addon.startsOn || 'Now'} – {addon.endsOn || 'No end date'}
                      </td>
                      <td>
                        <span
                          className={`partner-status partner-status--${addon.status === 'ACTIVE' ? 'approved' : 'pending'}`}
                        >
                          {addon.status.toLowerCase()}
                        </span>
                      </td>
                      <td>
                        <BookingAddonStatusButton
                          addon={{ id: addon.id, status: addon.status, version: addon.version }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No packages or add-ons have been published.</p>
          )}
        </Card>

        <Card>
          <p>
            Tax rates are property-entered commercial data, not tax advice. The selected add-ons
            become part of the booking total used for hosted payment, refund calculations,
            settlement evidence, and the guest folio—without a duplicate folio charge.
          </p>
        </Card>
      </div>
    </main>
  );
}
