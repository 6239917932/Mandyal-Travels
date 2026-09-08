import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerStockInventory } from '@/services/partnerStockInventoryService';

export const metadata: Metadata = { title: 'Procurement | Mandyal PMS' };

export default async function PartnerProcurementPage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partner');
  const workspace = await getPartnerStockInventory(access.partnerId);
  const reorderItems = workspace.items.filter((item) => item.quantityOnHand <= item.reorderLevel);
  const receipts = workspace.movements.filter((movement) => movement.movementType === 'RECEIPT');

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Procurement · shared stock evidence</p>
            <h1>Procurement control</h1>
            <p className="booking-page__intro">
              Use the existing property stock ledger as the single source for reorder decisions and
              received-goods evidence. No duplicate inventory balance is maintained here.
            </p>
          </div>
          <Link className="ui-button ui-button--secondary" href="/partner/pms/stock">
            Open stock ledger
          </Link>
        </header>
        {workspace.safetyLimitReached ? (
          <p className="booking-page__payment-error" role="alert">
            Display safety limit reached. Review the bounded stock export before placing orders.
          </p>
        ) : null}
        <div className="partner-bookings__summary">
          <Card>
            <span>Reorder lines</span>
            <strong>{reorderItems.length}</strong>
          </Card>
          <Card>
            <span>Receipt records</span>
            <strong>{receipts.length}</strong>
          </Card>
          <Card>
            <span>Managed properties</span>
            <strong>{workspace.properties.length}</strong>
          </Card>
          <Card>
            <span>Purchase release</span>
            <strong>Approval required</strong>
          </Card>
        </div>
        <Card>
          <p className="hotel-page__eyebrow">Reorder worklist</p>
          <h2>Items requiring review</h2>
          {reorderItems.length ? (
            <ul className="pms-room-rack__queue-list">
              {reorderItems.map((item) => (
                <li key={item.id}>
                  <strong>
                    {item.property.displayName} · {item.sku} · {item.name}
                  </strong>
                  <span>
                    On hand {item.quantityOnHand} · reorder level {item.reorderLevel}
                  </span>
                  <small>
                    Confirm vendor, price, tax treatment, and approval outside the stock balance
                    before ordering.
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No stock line is currently at or below its reorder level.</p>
          )}
        </Card>
        <Card>
          <p className="hotel-page__eyebrow">Goods receipt evidence</p>
          <h2>Recent stock receipts</h2>
          {receipts.length ? (
            <ul className="pms-room-rack__queue-list">
              {receipts.slice(0, 100).map((receipt) => (
                <li key={receipt.id}>
                  <strong>
                    {receipt.property.displayName} · {receipt.item.sku} · {receipt.quantity}
                  </strong>
                  <span>{receipt.note}</span>
                  <small>
                    {receipt.createdAt.toLocaleString('en-IN')} · resulting stock{' '}
                    {receipt.resultingQuantity}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No received-goods movement has been recorded.</p>
          )}
        </Card>
        <Card>
          <p>
            Vendor contracts, quotations, tax validation, and purchase-order approval remain
            human-controlled. This workspace never represents a stock receipt until the immutable
            stock movement exists.
          </p>
        </Card>
      </div>
    </main>
  );
}
