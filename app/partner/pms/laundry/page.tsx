import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  HotelGuestServiceOrderForm,
  HotelGuestServiceTransitionControls,
} from '@/components/partner/HotelPosControls';
import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import type { HotelPosStatus } from '@/lib/pms/pointOfSale';
import { getPartnerHotelGuestServiceWorkspace } from '@/services/partnerHotelPosService';

export const metadata: Metadata = { title: 'Laundry and minibar | Mandyal PMS' };

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

export default async function PartnerLaundryPage({ searchParams }: PageProps) {
  const access = await getPartnerAccess();
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') redirect('/partner');
  const values = await searchParams;
  const workspace = await getPartnerHotelGuestServiceWorkspace({
    partnerId: access.partnerId,
    requestedPropertyId: firstValue(values.property),
  });
  const activeOrders = workspace.orders.filter(
    (order) => !['POSTED', 'CANCELLED'].includes(order.status),
  );

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Guest services · controlled folio posting</p>
            <h1>Laundry and minibar</h1>
            <p className="booking-page__intro">
              Record itemized guest laundry and minibar services against an assigned, checked-in
              room. Completed services post once to the existing append-only guest folio.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner/pms/billing">
              Open Billing
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/housekeeping">
              Open Housekeeping
            </Link>
          </div>
        </header>

        {workspace.safetyLimitReached ? (
          <p className="booking-page__payment-error" role="alert">
            Display safety limit reached. Contact the platform administrator before recording more
            guest services.
          </p>
        ) : null}

        {workspace.selectedProperty ? (
          <>
            <Card>
              <form action="/partner/pms/laundry" className="supplier-form__grid" method="get">
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
                <span>Open laundry</span>
                <strong>
                  {activeOrders.filter((order) => order.serviceMode === 'LAUNDRY').length}
                </strong>
              </Card>
              <Card>
                <span>Unposted minibar</span>
                <strong>
                  {activeOrders.filter((order) => order.serviceMode === 'MINIBAR').length}
                </strong>
              </Card>
            </div>
            <Card>
              <p className="hotel-page__eyebrow">New guest service</p>
              <h2>{workspace.selectedProperty.name}</h2>
              {workspace.stays.some((stay) => stay.roomNumber) ? (
                <HotelGuestServiceOrderForm
                  propertyId={workspace.selectedProperty.id}
                  stays={workspace.stays.filter((stay) => stay.roomNumber)}
                />
              ) : (
                <>
                  <p>Check in and assign a physical room before recording a guest service.</p>
                  <Link className="ui-button ui-button--primary" href="/partner/bookings">
                    Open Front desk
                  </Link>
                </>
              )}
            </Card>

            {activeOrders.length ? (
              activeOrders.map((order) => (
                <Card key={order.id}>
                  <p className="hotel-page__eyebrow">
                    {order.serviceMode === 'LAUNDRY' ? 'Guest laundry' : 'Minibar posting'} ·{' '}
                    {order.status.toLowerCase()}
                  </p>
                  <h2>
                    Room {order.roomNumber} · {money(order.totalAmount, order.currency)}
                  </h2>
                  <p>
                    {order.confirmationCode} · {order.guestName} · {order.outletName}
                  </p>
                  <ul className="pms-room-rack__queue-list">
                    {order.items.map((item, index) => (
                      <li key={`${item.name}-${index}`}>
                        <strong>
                          {item.quantity} × {item.name}
                        </strong>
                        <span>{money(item.unitPrice, order.currency)} each</span>
                      </li>
                    ))}
                  </ul>
                  {order.note ? <p>Service note: {order.note}</p> : null}
                  <HotelGuestServiceTransitionControls
                    nextStatuses={order.nextStatuses as readonly HotelPosStatus[]}
                    orderId={order.id}
                    version={order.version}
                  />
                </Card>
              ))
            ) : (
              <Card>
                <h2>Guest-service queue is clear</h2>
                <p>No laundry or minibar service is waiting to be completed or posted.</p>
              </Card>
            )}

            <Card>
              <p className="hotel-page__eyebrow">Recent service ledger</p>
              <h2>Completed and cancelled work</h2>
              {workspace.orders.some((order) => ['POSTED', 'CANCELLED'].includes(order.status)) ? (
                <ul className="pms-room-rack__queue-list">
                  {workspace.orders
                    .filter((order) => ['POSTED', 'CANCELLED'].includes(order.status))
                    .map((order) => (
                      <li key={order.id}>
                        <strong>
                          {order.serviceMode.toLowerCase()} · {order.status.toLowerCase()} ·{' '}
                          {money(order.totalAmount, order.currency)}
                        </strong>
                        <span>
                          {order.confirmationCode} · room {order.roomNumber}
                          {order.folioEntryId ? ' · posted to guest folio' : ''}
                        </span>
                      </li>
                    ))}
                </ul>
              ) : (
                <p>No completed or cancelled guest services are recorded for this property.</p>
              )}
            </Card>
          </>
        ) : (
          <Card>
            <h2>No active managed hotel property</h2>
            <p>Add and activate a property before recording laundry or minibar services.</p>
            <Link className="ui-button ui-button--primary" href="/partner/properties">
              Open property settings
            </Link>
          </Card>
        )}
      </div>
    </main>
  );
}
