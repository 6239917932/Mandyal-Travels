'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';

type ApiResult = { data?: unknown; error?: { message?: string } };
type Property = { id: string; name: string };
type Vendor = { id: string; label: string; propertyId: string };
type Item = { id: string; label: string; propertyId: string; version: number };
type Order = { id: string; label: string; status: string; version: number };
type ReceiptLine = { id: string; label: string; orderVersion: number; stockVersion: number };

async function post(url: string, body: unknown) {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', 'x-idempotency-key': crypto.randomUUID() },
    method: 'POST',
  });
  const result = await readJsonResponse<ApiResult>(response);
  if (!response.ok)
    throw new Error(result?.error?.message ?? 'The request could not be completed.');
}

export function PurchaseOrderForm({
  properties,
  vendors,
  items,
}: {
  properties: Property[];
  vendors: Vendor[];
  items: Item[];
}) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? '');
  const [lineCount, setLineCount] = useState(1);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const availableVendors = useMemo(
    () => vendors.filter((vendor) => vendor.propertyId === propertyId),
    [propertyId, vendors],
  );
  const availableItems = useMemo(
    () => items.filter((item) => item.propertyId === propertyId),
    [items, propertyId],
  );
  async function submit(formData: FormData) {
    setPending(true);
    setMessage('');
    const lines = Array.from({ length: lineCount }, (_, index) => ({
      quantityOrdered: formData.get(`quantityOrdered-${index}`),
      stockItemId: formData.get(`stockItemId-${index}`),
      taxRatePercent: formData.get(`taxRatePercent-${index}`),
      unitPrice: formData.get(`unitPrice-${index}`),
    }));
    try {
      await post('/api/v1/partner/purchase-orders', {
        expectedDeliveryDate: formData.get('expectedDeliveryDate'),
        lines,
        note: formData.get('note'),
        orderDate: formData.get('orderDate'),
        propertyId,
        purchaseOrderNumber: formData.get('purchaseOrderNumber'),
        vendorId: formData.get('vendorId'),
      });
      setMessage('Draft purchase order created. Submit it for approval when ready.');
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'The purchase order could not be created.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form action={submit} className="supplier-form__grid">
      <label className="ui-field">
        <span className="ui-field__label">Property</span>
        <select
          className="ui-input"
          name="propertyId"
          onChange={(event) => setPropertyId(event.target.value)}
          value={propertyId}
          required
        >
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Active vendor</span>
        <select className="ui-input" name="vendorId" required>
          {availableVendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.label}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">PO number</span>
        <input className="ui-input" maxLength={40} name="purchaseOrderNumber" required />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Order date</span>
        <input className="ui-input" name="orderDate" type="date" required />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Expected delivery</span>
        <input className="ui-input" name="expectedDeliveryDate" type="date" required />
      </label>
      {Array.from({ length: lineCount }, (_, index) => (
        <fieldset className="supplier-form__full-width supplier-form__grid" key={index}>
          <legend>Order line {index + 1}</legend>
          <label className="ui-field">
            <span className="ui-field__label">Stock item</span>
            <select className="ui-input" name={`stockItemId-${index}`} required>
              {availableItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Quantity</span>
            <input
              className="ui-input"
              min="1"
              name={`quantityOrdered-${index}`}
              type="number"
              required
            />
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Unit price (₹)</span>
            <input
              className="ui-input"
              min="0.01"
              name={`unitPrice-${index}`}
              step="0.01"
              type="number"
              required
            />
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Estimated tax (%)</span>
            <input
              className="ui-input"
              defaultValue="0"
              min="0"
              max="100"
              name={`taxRatePercent-${index}`}
              step="0.01"
              type="number"
              required
            />
          </label>
        </fieldset>
      ))}
      <div className="supplier-form__full-width">
        <button
          className="ui-button ui-button--secondary"
          disabled={lineCount >= 10}
          onClick={() => setLineCount((count) => count + 1)}
          type="button"
        >
          Add order line
        </button>{' '}
        {lineCount > 1 ? (
          <button
            className="ui-button ui-button--secondary"
            onClick={() => setLineCount((count) => count - 1)}
            type="button"
          >
            Remove last line
          </button>
        ) : null}
      </div>
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Commercial note</span>
        <textarea className="ui-input" maxLength={500} name="note" rows={3} />
      </label>
      <button
        className="ui-button ui-button--primary"
        disabled={pending || !availableVendors.length || !availableItems.length}
        type="submit"
      >
        {pending ? 'Creating…' : 'Create draft PO'}
      </button>
      {message ? (
        <p aria-live="polite" className="supplier-form__full-width">
          {message}
        </p>
      ) : null}
    </form>
  );
}

export function PurchaseOrderActionForm({
  orders,
  canApprove,
}: {
  orders: Order[];
  canApprove: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(orders[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const order = orders.find((candidate) => candidate.id === selected);
  const actions =
    order?.status === 'DRAFT'
      ? ['SUBMIT', 'CANCEL']
      : order?.status === 'SUBMITTED'
        ? canApprove
          ? ['APPROVE', 'CANCEL']
          : ['CANCEL']
        : [];
  async function submit(formData: FormData) {
    if (!order) return;
    setPending(true);
    setMessage('');
    try {
      await post('/api/v1/partner/purchase-order-events', {
        action: formData.get('action'),
        expectedVersion: order.version,
        note: formData.get('note'),
        purchaseOrderId: order.id,
      });
      setMessage('Purchase-order decision recorded.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The decision could not be recorded.');
    } finally {
      setPending(false);
    }
  }
  return (
    <form action={submit} className="supplier-form__grid">
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Purchase order</span>
        <select
          className="ui-input"
          onChange={(event) => setSelected(event.target.value)}
          value={selected}
          required
        >
          {orders.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.label}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Decision</span>
        <select className="ui-input" name="action" required>
          {actions.map((action) => (
            <option key={action} value={action}>
              {action.toLowerCase()}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Reason</span>
        <input className="ui-input" minLength={5} maxLength={500} name="note" required />
      </label>
      <button
        className="ui-button ui-button--primary"
        disabled={pending || !actions.length}
        type="submit"
      >
        {pending ? 'Recording…' : 'Record decision'}
      </button>
      {message ? (
        <p aria-live="polite" className="supplier-form__full-width">
          {message}
        </p>
      ) : null}
    </form>
  );
}

export function GoodsReceiptForm({ lines }: { lines: ReceiptLine[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState(lines[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const line = lines.find((candidate) => candidate.id === selected);
  async function submit(formData: FormData) {
    if (!line) return;
    setPending(true);
    setMessage('');
    try {
      await post('/api/v1/partner/goods-receipts', {
        deliveryReference: formData.get('deliveryReference'),
        expectedOrderVersion: line.orderVersion,
        expectedStockVersion: line.stockVersion,
        note: formData.get('note'),
        purchaseOrderLineId: line.id,
        quantity: formData.get('quantity'),
        receivedOn: formData.get('receivedOn'),
      });
      setMessage('Goods received and the stock ledger was updated atomically.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The receipt could not be recorded.');
    } finally {
      setPending(false);
    }
  }
  return (
    <form action={submit} className="supplier-form__grid">
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Outstanding order line</span>
        <select
          className="ui-input"
          onChange={(event) => setSelected(event.target.value)}
          value={selected}
          required
        >
          {lines.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.label}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Quantity received</span>
        <input className="ui-input" min="1" name="quantity" type="number" required />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Received on</span>
        <input className="ui-input" name="receivedOn" type="date" required />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Invoice / delivery reference</span>
        <input className="ui-input" maxLength={100} name="deliveryReference" required />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Inspection note</span>
        <input className="ui-input" minLength={5} maxLength={500} name="note" required />
      </label>
      <button
        className="ui-button ui-button--primary"
        disabled={pending || !lines.length}
        type="submit"
      >
        {pending ? 'Receiving…' : 'Receive goods'}
      </button>
      {message ? (
        <p aria-live="polite" className="supplier-form__full-width">
          {message}
        </p>
      ) : null}
    </form>
  );
}
