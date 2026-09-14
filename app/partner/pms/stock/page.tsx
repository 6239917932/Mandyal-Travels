import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  StockItemForm,
  StockLocationForm,
  StockLotControls,
  StockMovementForm,
} from '@/components/partner/StockInventoryControls';
import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { stockExpiryPosture } from '@/lib/pms/stockInventory';
import { getPartnerStockInventory } from '@/services/partnerStockInventoryService';

export const metadata: Metadata = { title: 'Stock and inventory | Mandyal PMS' };
const label = (value: string) => value.toLowerCase().replaceAll('_', ' ');

export default async function PartnerStockInventoryPage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') redirect('/partner');
  const workspace = await getPartnerStockInventory(access.partnerId);
  const lowStock = workspace.items.filter(
    (item) => item.quantityOnHand <= item.reorderLevel,
  ).length;
  const today = new Date().toISOString().slice(0, 10);
  const expiryAttention = workspace.lots.filter((lot) => {
    const posture = stockExpiryPosture(lot.expiryDate, today);
    return posture === 'EXPIRED' || posture === 'EXPIRING_SOON';
  }).length;
  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Back office · append-only stock control</p>
            <h1>Stock and inventory</h1>
            <p className="booking-page__intro">
              Maintain property-scoped SKUs, expiry batches, store transfers, and reversible wastage
              without rewriting movement history.
            </p>
          </div>
          <Link className="ui-button ui-button--secondary" href="/partner/pms/accounting">
            Accounting
          </Link>
        </header>
        {workspace.safetyLimitReached ? (
          <p className="booking-page__payment-error" role="alert">
            Display safety limit reached. Stop entering movements and request a bounded inventory
            export.
          </p>
        ) : null}
        <div className="partner-bookings__summary">
          <Card>
            <span>Active SKUs</span>
            <strong>{workspace.items.length}</strong>
          </Card>
          <Card>
            <span>At or below reorder</span>
            <strong>{lowStock}</strong>
          </Card>
          <Card>
            <span>Recorded movements</span>
            <strong>{workspace.movements.length}</strong>
          </Card>
          <Card>
            <span>Expiry attention</span>
            <strong>{expiryAttention}</strong>
          </Card>
        </div>
        {access.memberRole === 'ADMIN' ? (
          <>
            <Card>
              <p className="hotel-page__eyebrow">Item master</p>
              <h2>Create a controlled SKU</h2>
              <StockItemForm
                properties={workspace.properties.map((property) => ({
                  id: property.id,
                  name: property.displayName,
                }))}
              />
            </Card>
            <Card>
              <p className="hotel-page__eyebrow">Store master</p>
              <h2>Create a property stock location</h2>
              <p>Separate the main store, kitchen, pantry, and housekeeping balances.</p>
              <StockLocationForm
                properties={workspace.properties.map((property) => ({
                  id: property.id,
                  name: property.displayName,
                }))}
              />
            </Card>
            <Card>
              <p className="hotel-page__eyebrow">Batch controls</p>
              <h2>Receive, transfer, waste, or reverse</h2>
              <p>
                Receipts and wastage reconcile the main SKU balance. Transfers preserve total
                property stock.
              </p>
              <StockLotControls
                items={workspace.items.map((item) => ({
                  id: item.id,
                  label: `${item.property.displayName} · ${item.sku} · ${item.name}`,
                  propertyId: item.propertyId,
                  version: item.version,
                }))}
                locations={workspace.locations.map((location) => ({
                  id: location.id,
                  label: `${location.property.displayName} · ${location.name}`,
                  propertyId: location.propertyId,
                }))}
                lots={workspace.lots
                  .filter((lot) => lot.quantityOnHand > 0)
                  .map((lot) => ({
                    id: lot.id,
                    itemVersion: lot.item.version,
                    label: `${lot.property.displayName} · ${lot.item.sku} · ${lot.lotCode} · ${lot.location.name} · ${lot.quantityOnHand} ${label(lot.item.unit)}`,
                    locationId: lot.locationId,
                    lotVersion: lot.version,
                  }))}
                reversibleWastage={workspace.lotEvents
                  .filter(
                    (event) => event.eventType === 'WASTAGE' && !event.reversedBy && event.fromLot,
                  )
                  .map((event) => ({
                    eventId: event.id,
                    itemVersion: event.item.version,
                    label: `${event.item.sku} · ${event.quantity} ${label(event.item.unit)} · ${event.note}`,
                    lotVersion: event.fromLot?.version ?? 0,
                  }))}
              />
            </Card>
          </>
        ) : null}
        <Card>
          <p className="hotel-page__eyebrow">Stock movement</p>
          <h2>Receive, issue, or correct stock</h2>
          <p>Every movement is immutable and retry-safe. An issue cannot make stock negative.</p>
          <StockMovementForm
            items={workspace.items.map((item) => ({
              id: item.id,
              label: `${item.property.displayName} · ${item.sku} · ${item.name} · ${item.quantityOnHand} ${label(item.unit)}`,
              version: item.version,
            }))}
          />
        </Card>
        <Card>
          <p className="hotel-page__eyebrow">On-hand register</p>
          <h2>Current property stock</h2>
          {workspace.items.length ? (
            <div className="pms-room-rack__table-wrap">
              <table className="pms-room-rack__table">
                <thead>
                  <tr>
                    <th scope="col">Property</th>
                    <th scope="col">SKU</th>
                    <th scope="col">Item</th>
                    <th scope="col">Category</th>
                    <th scope="col">On hand</th>
                    <th scope="col">Reorder</th>
                    <th scope="col">Posture</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.property.displayName}</td>
                      <td>{item.sku}</td>
                      <th scope="row">{item.name}</th>
                      <td>{label(item.category)}</td>
                      <td>
                        {item.quantityOnHand} {label(item.unit)}
                      </td>
                      <td>{item.reorderLevel}</td>
                      <td>{item.quantityOnHand <= item.reorderLevel ? 'Reorder' : 'Available'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No stock items have been created.</p>
          )}
        </Card>
        <Card>
          <p className="hotel-page__eyebrow">Expiry and location register</p>
          <h2>Batch balances</h2>
          {workspace.lots.length ? (
            <div className="pms-room-rack__table-wrap">
              <table className="pms-room-rack__table">
                <thead>
                  <tr>
                    <th scope="col">Property</th>
                    <th scope="col">Item</th>
                    <th scope="col">Batch</th>
                    <th scope="col">Location</th>
                    <th scope="col">Balance</th>
                    <th scope="col">Expiry</th>
                    <th scope="col">Posture</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.lots.map((lot) => (
                    <tr key={lot.id}>
                      <td>{lot.property.displayName}</td>
                      <th scope="row">
                        {lot.item.sku} · {lot.item.name}
                      </th>
                      <td>{lot.lotCode}</td>
                      <td>{lot.location.name}</td>
                      <td>
                        {lot.quantityOnHand} {label(lot.item.unit)}
                      </td>
                      <td>{lot.expiryDate || 'Not applicable'}</td>
                      <td>{label(stockExpiryPosture(lot.expiryDate, today))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No expiry-controlled batches have been received.</p>
          )}
        </Card>
        <Card>
          <p className="hotel-page__eyebrow">Batch event ledger</p>
          <h2>Transfer and wastage history</h2>
          {workspace.lotEvents.length ? (
            <ul className="pms-room-rack__queue-list">
              {workspace.lotEvents.map((event) => (
                <li key={event.id}>
                  <strong>
                    {event.item.sku} · {label(event.eventType)} · {event.quantity}{' '}
                    {label(event.item.unit)}
                  </strong>
                  <span>
                    {event.fromLocation?.name ?? 'External receipt'} →{' '}
                    {event.toLocation?.name ??
                      (event.eventType === 'WASTAGE' ? 'Wastage' : 'Ledger')}
                  </span>
                  <small>
                    {event.note} · {event.createdAt.toLocaleString('en-IN')}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No batch-control events have been recorded.</p>
          )}
        </Card>
        <Card>
          <p className="hotel-page__eyebrow">Movement ledger</p>
          <h2>Recent immutable activity</h2>
          {workspace.movements.length ? (
            <ul className="pms-room-rack__queue-list">
              {workspace.movements.map((movement) => (
                <li key={movement.id}>
                  <strong>
                    {movement.property.displayName} · {movement.item.sku} ·{' '}
                    {label(movement.movementType)} {movement.quantity}
                  </strong>
                  <span>{movement.note}</span>
                  <small>
                    Resulting stock {movement.resultingQuantity} {label(movement.item.unit)} ·{' '}
                    {movement.createdAt.toLocaleString('en-IN')}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No stock movements have been recorded.</p>
          )}
        </Card>
      </div>
    </main>
  );
}
