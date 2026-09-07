import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { HotelPosOrderForm } from '@/components/partner/HotelPosControls';
import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerHotelPosWorkspace } from '@/services/partnerHotelPosService';

export const metadata: Metadata = { title: 'Point of sale | Mandyal PMS' };

type PageProps = { searchParams: Promise<{ property?: string | string[] }> };
const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default async function PartnerPointOfSalePage({ searchParams }: PageProps) {
  const access = await getPartnerAccess();
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') redirect('/partner');
  const values = await searchParams;
  const workspace = await getPartnerHotelPosWorkspace({
    partnerId: access.partnerId,
    requestedPropertyId: firstValue(values.property),
  });

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Food and beverage · audited guest charging</p>
            <h1>Point of sale</h1>
            <p className="booking-page__intro">
              Place room-service or hotel-outlet orders for checked-in stays and carry every served
              order into the existing append-only guest folio.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner/pms/kitchen-display">
              Kitchen display
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/pms/billing">
              Open Billing
            </Link>
          </div>
        </header>

        {workspace.safetyLimitReached ? (
          <p className="booking-page__payment-error" role="alert">
            Display safety limit reached. Contact the platform administrator before placing more
            orders.
          </p>
        ) : null}

        {workspace.selectedProperty ? (
          <>
            <Card>
              <form
                action="/partner/pms/point-of-sale"
                className="supplier-form__grid"
                method="get"
              >
                <label className="ui-field supplier-form__full-width">
                  <span className="ui-field__label">Managed property</span>
                  <select
                    className="ui-input"
                    defaultValue={workspace.selectedProperty.id}
                    name="property"
                  >
                    {workspace.properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="ui-button ui-button--secondary" type="submit">
                  Open property
                </button>
              </form>
            </Card>
            <div className="partner-bookings__summary">
              <Card>
                <span>Business date</span>
                <strong>{workspace.businessDate}</strong>
              </Card>
              <Card>
                <span>Checked-in stays</span>
                <strong>{workspace.stays.length}</strong>
              </Card>
              <Card>
                <span>Open kitchen orders</span>
                <strong>
                  {
                    workspace.orders.filter(
                      (order) => !['POSTED', 'CANCELLED'].includes(order.status),
                    ).length
                  }
                </strong>
              </Card>
            </div>
            <Card>
              <p className="hotel-page__eyebrow">New order</p>
              <h2>{workspace.selectedProperty.name}</h2>
              {workspace.stays.length ? (
                <HotelPosOrderForm
                  propertyId={workspace.selectedProperty.id}
                  stays={[...workspace.stays]}
                />
              ) : (
                <>
                  <p>Check in and assign a room before placing a guest order.</p>
                  <Link className="ui-button ui-button--primary" href="/partner/bookings">
                    Open Front desk
                  </Link>
                </>
              )}
            </Card>
            <Card>
              <p className="hotel-page__eyebrow">Recent order ledger</p>
              <h2>Operational orders</h2>
              {workspace.orders.length ? (
                <ul className="pms-room-rack__queue-list">
                  {workspace.orders.map((order) => (
                    <li key={order.id}>
                      <strong>
                        {order.outletName} · {money(order.totalAmount, order.currency)} ·{' '}
                        {order.status.toLowerCase()}
                      </strong>
                      <span>
                        {order.confirmationCode} · {order.guestName}
                        {order.roomNumber ? ` · room ${order.roomNumber}` : ''}
                      </span>
                      <small>
                        {order.items.map((item) => `${item.quantity}× ${item.name}`).join(' · ')}
                        {order.folioEntryId ? ' · posted to guest folio' : ''}
                      </small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No orders have been placed for this property.</p>
              )}
            </Card>
          </>
        ) : (
          <Card>
            <h2>No active managed hotel property</h2>
            <p>Add and activate a property before using Point of Sale.</p>
            <Link className="ui-button ui-button--primary" href="/partner/properties">
              Open property settings
            </Link>
          </Card>
        )}
      </div>
    </main>
  );
}
