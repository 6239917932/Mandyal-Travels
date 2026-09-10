import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  HotelPosOrderForm,
  HotelPosTransitionControls,
} from '@/components/partner/HotelPosControls';
import { CaptainGuestOrderLink } from '@/components/partner/CaptainGuestOrderLink';
import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import type { HotelPosStatus } from '@/lib/pms/pointOfSale';
import { getPartnerHotelPosWorkspace } from '@/services/partnerHotelPosService';
import { getPartnerRestaurantCatalogWorkspace } from '@/services/partnerRestaurantCatalogService';

export const metadata: Metadata = { title: 'Captain mobile operations | Mandyal PMS' };

type PageProps = { searchParams: Promise<{ property?: string | string[] }> };
const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function CaptainMobileOperationsPage({ searchParams }: PageProps) {
  const access = await getPartnerAccess();
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') redirect('/partner');
  const values = await searchParams;
  const [workspace, restaurant] = await Promise.all([
    getPartnerHotelPosWorkspace({
      partnerId: access.partnerId,
      requestedPropertyId: firstValue(values.property),
    }),
    getPartnerRestaurantCatalogWorkspace(access.partnerId),
  ]);
  const activeOrders = workspace.orders.filter(
    (order) => !['POSTED', 'CANCELLED'].includes(order.status),
  );
  const activeMenuItems = workspace.selectedProperty
    ? restaurant.menuItems.filter(
        (item) => item.propertyId === workspace.selectedProperty?.id && item.status === 'ACTIVE',
      ).length
    : 0;

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Mobile operations · captain workspace</p>
            <h1>Captain order console</h1>
            <p className="booking-page__intro">
              Place audited dining orders, share secure guest ordering links, and move live tickets
              through the same POS, kitchen, folio, and immutable audit workflow.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner/pms/restaurant">
              Menus
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/pms/kitchen-display">
              Kitchen
            </Link>
          </div>
        </header>

        {workspace.selectedProperty ? (
          <>
            <Card>
              <form action="/partner/pms/captain" className="supplier-form__grid" method="get">
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
                <span>Checked-in stays</span>
                <strong>{workspace.stays.length}</strong>
              </Card>
              <Card>
                <span>Active menu items</span>
                <strong>{activeMenuItems}</strong>
              </Card>
              <Card>
                <span>Open orders</span>
                <strong>{activeOrders.length}</strong>
              </Card>
              <Card>
                <span>Ready to serve</span>
                <strong>{activeOrders.filter((order) => order.status === 'READY').length}</strong>
              </Card>
            </div>

            <Card>
              <p className="hotel-page__eyebrow">Captain order entry</p>
              <h2>Place an order for a checked-in guest</h2>
              {workspace.stays.length ? (
                <HotelPosOrderForm
                  propertyId={workspace.selectedProperty.id}
                  stays={[...workspace.stays]}
                />
              ) : (
                <p>No checked-in stays are available for ordering.</p>
              )}
            </Card>

            <Card>
              <p className="hotel-page__eyebrow">QR guest ordering</p>
              <h2>Share a secure digital-menu link</h2>
              <p>
                The guest must use the booking-access cookie or their matching Mandyal account.
                Orders use server-held catalogue prices and enter the same kitchen queue.
              </p>
              {workspace.stays.length ? (
                <ul className="pms-room-rack__queue-list">
                  {workspace.stays.map((stay) => (
                    <li key={stay.confirmationCode}>
                      <strong>
                        {stay.guestName}
                        {stay.roomNumber ? ` · room ${stay.roomNumber}` : ''}
                      </strong>
                      <CaptainGuestOrderLink
                        confirmationCode={stay.confirmationCode}
                        guestName={stay.guestName}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Check in a guest before sharing an ordering link.</p>
              )}
            </Card>

            <Card>
              <p className="hotel-page__eyebrow">Live service queue</p>
              <h2>Accept, prepare, and serve</h2>
              {activeOrders.length ? (
                activeOrders.map((order) => (
                  <section key={order.id}>
                    <h3>
                      {order.outletName} · {order.confirmationCode}
                    </h3>
                    <p>
                      {order.guestName}
                      {order.roomNumber ? ` · room ${order.roomNumber}` : ''} ·{' '}
                      {order.status.toLowerCase()}
                    </p>
                    <ul className="pms-room-rack__queue-list">
                      {order.items.map((item, index) => (
                        <li key={`${order.id}-${index}`}>
                          <strong>
                            {item.quantity} × {item.name}
                          </strong>
                          <span>INR {item.unitPrice} each</span>
                        </li>
                      ))}
                    </ul>
                    <HotelPosTransitionControls
                      nextStatuses={order.nextStatuses as readonly HotelPosStatus[]}
                      orderId={order.id}
                      version={order.version}
                    />
                  </section>
                ))
              ) : (
                <p>The live service queue is clear.</p>
              )}
            </Card>
          </>
        ) : (
          <Card>
            <h2>No active managed hotel property</h2>
            <p>Add and activate a property before opening Captain operations.</p>
            <Link className="ui-button ui-button--primary" href="/partner/properties">
              Open property settings
            </Link>
          </Card>
        )}
      </div>
    </main>
  );
}
