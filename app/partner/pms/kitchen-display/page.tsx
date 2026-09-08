import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { HotelPosTransitionControls } from '@/components/partner/HotelPosControls';
import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import type { HotelPosStatus } from '@/lib/pms/pointOfSale';
import { getPartnerHotelPosWorkspace } from '@/services/partnerHotelPosService';

export const metadata: Metadata = { title: 'Kitchen display | Mandyal PMS' };

type PageProps = { searchParams: Promise<{ property?: string | string[] }> };
const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function PartnerKitchenDisplayPage({ searchParams }: PageProps) {
  const access = await getPartnerAccess();
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') redirect('/partner');
  const values = await searchParams;
  const workspace = await getPartnerHotelPosWorkspace({
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
            <p className="hotel-page__eyebrow">Kitchen control · immutable state history</p>
            <h1>Kitchen display</h1>
            <p className="booking-page__intro">
              Move verified guest orders through accepted, preparing and ready states. Serving an
              order posts its full value to the linked guest folio in the same transaction.
            </p>
          </div>
          <Link className="ui-button ui-button--secondary" href="/partner/pms/point-of-sale">
            Open Point of sale
          </Link>
        </header>

        {workspace.selectedProperty ? (
          <>
            <Card>
              <form
                action="/partner/pms/kitchen-display"
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
                  Open queue
                </button>
              </form>
            </Card>
            <div className="partner-bookings__summary">
              {(['PLACED', 'ACCEPTED', 'PREPARING', 'READY'] as const).map((status) => (
                <Card key={status}>
                  <span>{status.toLowerCase()}</span>
                  <strong>{activeOrders.filter((order) => order.status === status).length}</strong>
                </Card>
              ))}
            </div>
            {activeOrders.length ? (
              activeOrders.map((order) => (
                <Card key={order.id}>
                  <p className="hotel-page__eyebrow">
                    {order.serviceMode.replaceAll('_', ' ').toLowerCase()} ·{' '}
                    {order.status.toLowerCase()}
                  </p>
                  <h2>
                    {order.outletName} · {order.confirmationCode}
                  </h2>
                  <p>
                    {order.guestName}
                    {order.roomNumber ? ` · room ${order.roomNumber}` : ''} · business date{' '}
                    {workspace.businessDate}
                  </p>
                  <ul className="pms-room-rack__queue-list">
                    {order.items.map((item, index) => (
                      <li key={`${item.name}-${index}`}>
                        <strong>
                          {item.quantity} × {item.name}
                        </strong>
                        <span>INR {item.unitPrice} each</span>
                      </li>
                    ))}
                  </ul>
                  {order.note ? <p>Service note: {order.note}</p> : null}
                  <HotelPosTransitionControls
                    nextStatuses={order.nextStatuses as readonly HotelPosStatus[]}
                    orderId={order.id}
                    version={order.version}
                  />
                </Card>
              ))
            ) : (
              <Card>
                <h2>Kitchen queue is clear</h2>
                <p>No placed, accepted, preparing or ready orders are waiting.</p>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <h2>No active managed hotel property</h2>
            <p>Add and activate a property before opening the kitchen queue.</p>
            <Link className="ui-button ui-button--primary" href="/partner/properties">
              Open property settings
            </Link>
          </Card>
        )}
      </div>
    </main>
  );
}
