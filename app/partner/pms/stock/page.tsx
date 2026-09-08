import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { StockItemForm, StockMovementForm } from '@/components/partner/StockInventoryControls';
import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
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
  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Back office · append-only stock control</p>
            <h1>Stock and inventory</h1>
            <p className="booking-page__intro">
              Maintain property-scoped SKUs and record receipts, issues, and corrections without
              rewriting movement history.
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
            <span>Managed properties</span>
            <strong>{workspace.properties.length}</strong>
          </Card>
        </div>
        {access.memberRole === 'ADMIN' ? (
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
