import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  RestaurantMenuItemForm,
  RestaurantOutletForm,
  RestaurantStatusForm,
  RestaurantTableForm,
} from '@/components/partner/RestaurantCatalogControls';
import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerRestaurantCatalogWorkspace } from '@/services/partnerRestaurantCatalogService';

export const metadata: Metadata = { title: 'Restaurant menus and tables | Mandyal PMS' };

function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default async function PartnerRestaurantCatalogPage() {
  const access = await getPartnerAccess();
  if (
    !access?.partnerId ||
    !access.userId ||
    access.partnerType !== 'HOTEL' ||
    access.memberRole !== 'ADMIN'
  )
    redirect('/partner');
  const workspace = await getPartnerRestaurantCatalogWorkspace(access.partnerId);
  const activeOutlets = workspace.outlets.filter((outlet) => outlet.status === 'ACTIVE');
  const activeTables = workspace.tables.filter((table) => table.status === 'ACTIVE').length;
  const activeMenuItems = workspace.menuItems.filter((item) => item.status === 'ACTIVE').length;
  const outletOptions = activeOutlets.map((outlet) => ({
    id: outlet.id,
    label: `${outlet.property.displayName} · ${outlet.name}`,
  }));
  const entityOptions = [
    ...workspace.outlets.map((outlet) => ({
      id: outlet.id,
      label: `Outlet · ${outlet.property.displayName} · ${outlet.name}`,
      status: outlet.status,
      type: 'OUTLET' as const,
      version: outlet.version,
    })),
    ...workspace.tables.map((table) => ({
      id: table.id,
      label: `Table · ${table.outlet.name} · ${table.tableCode}`,
      status: table.status,
      type: 'TABLE' as const,
      version: table.version,
    })),
    ...workspace.menuItems.map((item) => ({
      id: item.id,
      label: `Menu · ${item.outlet.name} · ${item.name}`,
      status: item.status,
      type: 'MENU_ITEM' as const,
      version: item.version,
    })),
  ];

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Food service · controlled operating catalogue</p>
            <h1>Restaurant menus and tables</h1>
            <p className="booking-page__intro">
              Register property outlets, dining tables, capacities, and priced menu items for the
              existing POS and kitchen operation without creating another order or folio ledger.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner/pms/point-of-sale">
              Point of sale
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/pms/kitchen-display">
              Kitchen display
            </Link>
          </div>
        </header>

        {workspace.safetyLimitReached ? (
          <p className="booking-page__payment-error" role="alert">
            Display safety limit reached. Contact the platform administrator before recording more
            restaurant configuration.
          </p>
        ) : null}

        <div className="partner-bookings__summary">
          <Card>
            <span>Active outlets</span>
            <strong>{activeOutlets.length}</strong>
          </Card>
          <Card>
            <span>Service-ready tables</span>
            <strong>{activeTables}</strong>
          </Card>
          <Card>
            <span>Available menu items</span>
            <strong>{activeMenuItems}</strong>
          </Card>
          <Card>
            <span>Recorded changes</span>
            <strong>{workspace.events.length}</strong>
          </Card>
        </div>

        <div className="partner-workspace__columns">
          <Card>
            <p className="hotel-page__eyebrow">Outlet master</p>
            <h2>Register a restaurant or service outlet</h2>
            <RestaurantOutletForm
              properties={workspace.properties.map((property) => ({
                id: property.id,
                label: property.displayName,
              }))}
            />
          </Card>
          <Card>
            <p className="hotel-page__eyebrow">Table inventory</p>
            <h2>Add controlled dining capacity</h2>
            <RestaurantTableForm outlets={outletOptions} />
          </Card>
          <Card>
            <p className="hotel-page__eyebrow">Menu catalogue</p>
            <h2>Add a priced menu item</h2>
            <RestaurantMenuItemForm outlets={outletOptions} />
          </Card>
          <Card>
            <p className="hotel-page__eyebrow">Lifecycle control</p>
            <h2>Pause or restore availability</h2>
            <p>Every status change is version checked, reasoned, and preserved.</p>
            <RestaurantStatusForm entities={entityOptions} />
          </Card>
        </div>

        <Card>
          <p className="hotel-page__eyebrow">Outlet and table directory</p>
          <h2>Current service configuration</h2>
          {workspace.outlets.length ? (
            <div className="pms-room-rack__table-wrap">
              <table className="pms-room-rack__table">
                <thead>
                  <tr>
                    <th scope="col">Property</th>
                    <th scope="col">Outlet</th>
                    <th scope="col">Area</th>
                    <th scope="col">Tables</th>
                    <th scope="col">Capacity</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.outlets.map((outlet) => {
                    const tables = workspace.tables.filter((table) => table.outletId === outlet.id);
                    return (
                      <tr key={outlet.id}>
                        <td>{outlet.property.displayName}</td>
                        <th scope="row">
                          {outlet.name}
                          <small>{outlet.outletCode}</small>
                        </th>
                        <td>{outlet.serviceArea || 'Not specified'}</td>
                        <td>{tables.length}</td>
                        <td>
                          {tables
                            .filter((table) => table.status === 'ACTIVE')
                            .reduce((sum, table) => sum + table.capacity, 0)}{' '}
                          guests
                        </td>
                        <td>
                          <span
                            className={`partner-status partner-status--${outlet.status === 'ACTIVE' ? 'approved' : 'pending'}`}
                          >
                            {outlet.status.toLowerCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No restaurant outlets have been registered.</p>
          )}
        </Card>

        <Card>
          <p className="hotel-page__eyebrow">Menu directory</p>
          <h2>Priced service items</h2>
          {workspace.menuItems.length ? (
            <div className="pms-room-rack__table-wrap">
              <table className="pms-room-rack__table">
                <thead>
                  <tr>
                    <th scope="col">Outlet</th>
                    <th scope="col">Category</th>
                    <th scope="col">Item</th>
                    <th scope="col">Price</th>
                    <th scope="col">Dietary</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.menuItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.outlet.name}</td>
                      <td>{item.category}</td>
                      <th scope="row">
                        {item.name}
                        <small>{item.description}</small>
                      </th>
                      <td>{money(item.unitPrice, item.currency)}</td>
                      <td>{item.vegetarian ? 'Vegetarian' : 'Not marked'}</td>
                      <td>
                        <span
                          className={`partner-status partner-status--${item.status === 'ACTIVE' ? 'approved' : 'pending'}`}
                        >
                          {item.status.toLowerCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No menu items have been registered.</p>
          )}
        </Card>

        <Card>
          <p className="hotel-page__eyebrow">Immutable history</p>
          <h2>Recent restaurant changes</h2>
          {workspace.events.length ? (
            <ul className="pms-room-rack__queue-list">
              {workspace.events.map((event) => (
                <li key={event.id}>
                  <strong>
                    {event.property.displayName} ·{' '}
                    {event.entityType.toLowerCase().replaceAll('_', ' ')} ·{' '}
                    {event.action.toLowerCase()}
                  </strong>
                  <span>{event.note}</span>
                  <small>
                    {event.fromStatus.toLowerCase()} → {event.toStatus.toLowerCase()} ·{' '}
                    {event.createdAt.toLocaleString('en-IN')}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No restaurant configuration changes have been recorded.</p>
          )}
        </Card>

        <Card>
          <p>
            This catalogue does not reserve tables, accept QR orders, post charges, or collect
            payments. Guest orders continue through the existing audited Point of Sale, kitchen, and
            append-only folio workflows.
          </p>
        </Card>
      </div>
    </main>
  );
}
