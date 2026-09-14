import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  GoodsReceiptForm,
  PurchaseOrderActionForm,
  PurchaseOrderForm,
} from '@/components/partner/ProcurementControls';
import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerProcurementWorkspace } from '@/services/partnerProcurementService';

export const metadata: Metadata = { title: 'Procurement | Mandyal PMS' };

export default async function PartnerProcurementPage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') redirect('/partner');
  const workspace = await getPartnerProcurementWorkspace(access.partnerId);
  const reorderItems = workspace.items.filter((item) => item.quantityOnHand <= item.reorderLevel);
  const decisionOrders = workspace.orders.filter((order) =>
    ['DRAFT', 'SUBMITTED'].includes(order.status),
  );
  const receiptLines = workspace.orders.flatMap((order) =>
    ['APPROVED', 'PARTIALLY_RECEIVED'].includes(order.status)
      ? order.lines
          .filter((line) => line.quantityReceived < line.quantityOrdered)
          .map((line) => ({
            id: line.id,
            label: `${order.purchaseOrderNumber} · ${line.stockItem.sku} · outstanding ${line.quantityOrdered - line.quantityReceived} ${line.stockItem.unit.toLowerCase()}`,
            orderVersion: order.version,
            stockVersion: line.stockItem.version,
          }))
      : [],
  );

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Procurement · approval and receipt control</p>
            <h1>Procurement control</h1>
            <p className="booking-page__intro">
              Raise property purchase orders, record submission and approval decisions, and match
              partial deliveries into the existing stock ledger without duplicating inventory.
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
            <span>Purchase orders</span>
            <strong>{workspace.orders.length}</strong>
          </Card>
          <Card>
            <span>Managed properties</span>
            <strong>{workspace.properties.length}</strong>
          </Card>
          <Card>
            <span>Matched receipts</span>
            <strong>{workspace.receipts.length}</strong>
          </Card>
        </div>
        <div className="partner-workspace__columns">
          <Card>
            <p className="hotel-page__eyebrow">Purchase request</p>
            <h2>Create a draft purchase order</h2>
            <PurchaseOrderForm
              items={workspace.items.map((item) => ({
                id: item.id,
                label: `${item.sku} · ${item.name} (${item.unit.toLowerCase()})`,
                propertyId: item.propertyId,
                version: item.version,
              }))}
              properties={workspace.properties.map((property) => ({
                id: property.id,
                name: property.displayName,
              }))}
              vendors={workspace.vendors.map((vendor) => ({
                id: vendor.id,
                label: `${vendor.vendorCode} · ${vendor.legalName}`,
                propertyId: vendor.propertyId,
              }))}
            />
          </Card>
          <Card>
            <p className="hotel-page__eyebrow">Recorded approval</p>
            <h2>Submit, approve, or cancel</h2>
            <p>
              Only an approved order can receive goods. Every decision requires a reason and remains
              in the immutable history.
            </p>
            <PurchaseOrderActionForm
              canApprove={access.memberRole === 'ADMIN'}
              orders={decisionOrders.map((order) => ({
                id: order.id,
                label: `${order.purchaseOrderNumber} · ${order.vendor.vendorCode} · ${order.status.toLowerCase()}`,
                status: order.status,
                version: order.version,
              }))}
            />
          </Card>
        </div>
        <Card>
          <p className="hotel-page__eyebrow">Partial goods receipt</p>
          <h2>Match a delivery to an approved order line</h2>
          <p>
            The order line, order version, and stock balance are checked together. An over-receipt
            is rejected and a successful receipt updates stock in the same database transaction.
          </p>
          <GoodsReceiptForm lines={receiptLines} />
        </Card>
        <Card>
          <p className="hotel-page__eyebrow">Purchase-order register</p>
          <h2>Current controlled orders</h2>
          {workspace.orders.length ? (
            <div className="pms-room-rack__table-wrap">
              <table className="pms-room-rack__table">
                <thead>
                  <tr>
                    <th>PO / property</th>
                    <th>Vendor</th>
                    <th>Dates</th>
                    <th>Lines received</th>
                    <th>Value</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.orders.map((order) => {
                    const received = order.lines.reduce(
                      (sum, line) => sum + line.quantityReceived,
                      0,
                    );
                    const ordered = order.lines.reduce(
                      (sum, line) => sum + line.quantityOrdered,
                      0,
                    );
                    return (
                      <tr key={order.id}>
                        <th scope="row">
                          {order.purchaseOrderNumber}
                          <small>{order.property.displayName}</small>
                        </th>
                        <td>
                          {order.vendor.vendorCode}
                          <small>{order.vendor.legalName}</small>
                        </td>
                        <td>
                          {order.orderDate}
                          <small>Expected {order.expectedDeliveryDate}</small>
                        </td>
                        <td>
                          {received} / {ordered}
                        </td>
                        <td>
                          ₹
                          {(order.totalMinor / 100).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}
                          <small>
                            Estimated tax ₹
                            {(order.taxMinor / 100).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                            })}
                          </small>
                        </td>
                        <td>
                          <span
                            className={`partner-status partner-status--${order.status === 'RECEIVED' ? 'approved' : order.status === 'CANCELLED' ? 'rejected' : 'pending'}`}
                          >
                            {order.status.toLowerCase().replaceAll('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No purchase orders have been created.</p>
          )}
        </Card>
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
          <p className="hotel-page__eyebrow">Immutable goods-receipt evidence</p>
          <h2>Recent matched receipts</h2>
          {workspace.receipts.length ? (
            <ul className="pms-room-rack__queue-list">
              {workspace.receipts.map((receipt) => (
                <li key={receipt.id}>
                  <strong>
                    {receipt.purchaseOrder.purchaseOrderNumber} · {receipt.stockItem.sku} ·{' '}
                    {receipt.quantity} {receipt.stockItem.unit.toLowerCase()}
                  </strong>
                  <span>
                    {receipt.deliveryReference} · {receipt.note}
                  </span>
                  <small>
                    Received {receipt.receivedOn} · recorded{' '}
                    {receipt.createdAt.toLocaleString('en-IN')}
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
            Purchase-order values and tax are procurement estimates, not tax-credit or payment
            authorization. Vendor contracts, statutory invoice validation, bank details, and
            supplier payment release remain separate human-controlled finance workflows.
          </p>
        </Card>
      </div>
    </main>
  );
}
