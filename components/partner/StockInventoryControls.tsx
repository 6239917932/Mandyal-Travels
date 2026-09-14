'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';
import {
  HOTEL_STOCK_CATEGORIES,
  HOTEL_STOCK_MOVEMENTS,
  HOTEL_STOCK_UNITS,
} from '@/lib/pms/stockInventoryCatalog';

type ApiResult = { data?: unknown; error?: { message?: string } };

export function StockItemForm({ properties }: { properties: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(formData: FormData) {
    setPending(true);
    setMessage('');
    const response = await fetch('/api/v1/partner/stock-items', {
      body: JSON.stringify(Object.fromEntries(formData)),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const result = await readJsonResponse<ApiResult>(response);
    setPending(false);
    if (!response.ok)
      return setMessage(result?.error?.message ?? 'The stock item could not be created.');
    setMessage('Stock item created.');
    router.refresh();
  }
  return (
    <form action={submit} className="supplier-form__grid">
      <label className="ui-field">
        <span className="ui-field__label">Property</span>
        <select className="ui-input" name="propertyId" required>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">SKU</span>
        <input className="ui-input" maxLength={40} name="sku" required />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Item name</span>
        <input className="ui-input" maxLength={100} name="name" required />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Category</span>
        <select className="ui-input" name="category">
          {HOTEL_STOCK_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {value.toLowerCase()}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Unit</span>
        <select className="ui-input" name="unit">
          {HOTEL_STOCK_UNITS.map((value) => (
            <option key={value} value={value}>
              {value.toLowerCase()}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Opening quantity</span>
        <input
          className="ui-input"
          defaultValue="0"
          min="0"
          name="quantityOnHand"
          required
          type="number"
        />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Reorder level</span>
        <input
          className="ui-input"
          defaultValue="0"
          min="0"
          name="reorderLevel"
          required
          type="number"
        />
      </label>
      <button
        className="ui-button ui-button--primary"
        disabled={pending || !properties.length}
        type="submit"
      >
        {pending ? 'Creating…' : 'Create stock item'}
      </button>
      {message ? (
        <p aria-live="polite" className="supplier-form__full-width">
          {message}
        </p>
      ) : null}
    </form>
  );
}

export function StockMovementForm({
  items,
}: {
  items: Array<{ id: string; label: string; version: number }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState(items[0]?.id ?? '');
  async function submit(formData: FormData) {
    setPending(true);
    setMessage('');
    formData.set(
      'expectedVersion',
      String(items.find((item) => item.id === selected)?.version ?? 0),
    );
    const response = await fetch('/api/v1/partner/stock-movements', {
      body: JSON.stringify(Object.fromEntries(formData)),
      headers: { 'Content-Type': 'application/json', 'x-idempotency-key': crypto.randomUUID() },
      method: 'POST',
    });
    const result = await readJsonResponse<ApiResult>(response);
    setPending(false);
    if (!response.ok)
      return setMessage(result?.error?.message ?? 'The stock movement could not be recorded.');
    setMessage('Stock movement recorded.');
    router.refresh();
  }
  return (
    <form action={submit} className="supplier-form__grid">
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Stock item</span>
        <select
          className="ui-input"
          name="itemId"
          onChange={(event) => setSelected(event.target.value)}
          value={selected}
          required
        >
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Movement</span>
        <select className="ui-input" name="movementType">
          {HOTEL_STOCK_MOVEMENTS.map((value) => (
            <option key={value} value={value}>
              {value.toLowerCase().replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Quantity</span>
        <input className="ui-input" min="1" name="quantity" required type="number" />
      </label>
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Reason or source</span>
        <input className="ui-input" minLength={5} maxLength={300} name="note" required />
      </label>
      <button
        className="ui-button ui-button--primary"
        disabled={pending || !items.length}
        type="submit"
      >
        {pending ? 'Recording…' : 'Record movement'}
      </button>
      {message ? (
        <p aria-live="polite" className="supplier-form__full-width">
          {message}
        </p>
      ) : null}
    </form>
  );
}

type StockLocationOption = { id: string; label: string; propertyId: string };
type StockLotOption = {
  id: string;
  itemVersion: number;
  label: string;
  locationId: string;
  lotVersion: number;
};
type WastageOption = {
  eventId: string;
  itemVersion: number;
  label: string;
  lotVersion: number;
};

export function StockLocationForm({
  properties,
}: {
  properties: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(formData: FormData) {
    setPending(true);
    setMessage('');
    const response = await fetch('/api/v1/partner/stock-locations', {
      body: JSON.stringify(Object.fromEntries(formData)),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const result = await readJsonResponse<ApiResult>(response);
    setPending(false);
    if (!response.ok)
      return setMessage(result?.error?.message ?? 'The stock location could not be created.');
    setMessage('Stock location created.');
    router.refresh();
  }
  return (
    <form action={submit} className="supplier-form__grid">
      <label className="ui-field">
        <span className="ui-field__label">Property</span>
        <select className="ui-input" name="propertyId" required>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Store code</span>
        <input className="ui-input" maxLength={30} name="code" required />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Store name</span>
        <input className="ui-input" maxLength={100} name="name" required />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Type</span>
        <select className="ui-input" name="kind">
          <option value="STORE">Main/store room</option>
          <option value="PANTRY">Pantry</option>
          <option value="KITCHEN">Kitchen</option>
          <option value="HOUSEKEEPING">Housekeeping</option>
        </select>
      </label>
      <button
        className="ui-button ui-button--primary"
        disabled={pending || !properties.length}
        type="submit"
      >
        {pending ? 'Creating…' : 'Create stock location'}
      </button>
      {message ? (
        <p aria-live="polite" className="supplier-form__full-width">
          {message}
        </p>
      ) : null}
    </form>
  );
}

export function StockLotControls({
  items,
  locations,
  lots,
  reversibleWastage,
}: {
  items: Array<{ id: string; label: string; propertyId: string; version: number }>;
  locations: StockLocationOption[];
  lots: StockLotOption[];
  reversibleWastage: WastageOption[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [receiptItem, setReceiptItem] = useState(items[0]?.id ?? '');
  const [transferLot, setTransferLot] = useState(lots[0]?.id ?? '');
  const [wastageLot, setWastageLot] = useState(lots[0]?.id ?? '');
  const [reversal, setReversal] = useState(reversibleWastage[0]?.eventId ?? '');

  async function submit(formData: FormData) {
    setPending(true);
    setMessage('');
    const action = String(formData.get('action') ?? '');
    if (action === 'RECEIPT')
      formData.set(
        'expectedItemVersion',
        String(items.find((item) => item.id === receiptItem)?.version ?? 0),
      );
    if (action === 'TRANSFER')
      formData.set(
        'expectedLotVersion',
        String(lots.find((lot) => lot.id === transferLot)?.lotVersion ?? 0),
      );
    if (action === 'WASTAGE') {
      const lot = lots.find((candidate) => candidate.id === wastageLot);
      formData.set('expectedItemVersion', String(lot?.itemVersion ?? 0));
      formData.set('expectedLotVersion', String(lot?.lotVersion ?? 0));
    }
    if (action === 'WASTAGE_REVERSAL') {
      const event = reversibleWastage.find((candidate) => candidate.eventId === reversal);
      formData.set('expectedItemVersion', String(event?.itemVersion ?? 0));
      formData.set('expectedLotVersion', String(event?.lotVersion ?? 0));
    }
    const response = await fetch('/api/v1/partner/stock-lot-events', {
      body: JSON.stringify(Object.fromEntries(formData)),
      headers: { 'Content-Type': 'application/json', 'x-idempotency-key': crypto.randomUUID() },
      method: 'POST',
    });
    const result = await readJsonResponse<ApiResult>(response);
    setPending(false);
    if (!response.ok)
      return setMessage(
        result?.error?.message ?? 'The batch-control action could not be recorded.',
      );
    setMessage(`${action.toLowerCase().replaceAll('_', ' ')} recorded.`);
    router.refresh();
  }

  return (
    <div className="pms-dashboard__grid">
      <form action={submit} className="supplier-form__grid">
        <input name="action" type="hidden" value="RECEIPT" />
        <h3 className="supplier-form__full-width">Receive an expiry-controlled batch</h3>
        <label className="ui-field supplier-form__full-width">
          <span className="ui-field__label">Stock item</span>
          <select
            className="ui-input"
            name="itemId"
            onChange={(event) => setReceiptItem(event.target.value)}
            value={receiptItem}
            required
          >
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Receiving location</span>
          <select className="ui-input" name="locationId" required>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.label}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Batch / lot code</span>
          <input className="ui-input" maxLength={50} name="lotCode" required />
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Expiry date (optional)</span>
          <input className="ui-input" name="expiryDate" type="date" />
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Quantity</span>
          <input className="ui-input" min="1" name="quantity" required type="number" />
        </label>
        <label className="ui-field supplier-form__full-width">
          <span className="ui-field__label">Receipt source / note</span>
          <input className="ui-input" minLength={5} maxLength={300} name="note" required />
        </label>
        <button
          className="ui-button ui-button--primary"
          disabled={pending || !items.length || !locations.length}
          type="submit"
        >
          Receive batch
        </button>
      </form>
      <form action={submit} className="supplier-form__grid">
        <input name="action" type="hidden" value="TRANSFER" />
        <h3 className="supplier-form__full-width">Transfer a batch between stores</h3>
        <label className="ui-field supplier-form__full-width">
          <span className="ui-field__label">Source batch</span>
          <select
            className="ui-input"
            name="fromLotId"
            onChange={(event) => setTransferLot(event.target.value)}
            value={transferLot}
            required
          >
            {lots.map((lot) => (
              <option key={lot.id} value={lot.id}>
                {lot.label}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Destination</span>
          <select className="ui-input" name="toLocationId" required>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.label}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Quantity</span>
          <input className="ui-input" min="1" name="quantity" required type="number" />
        </label>
        <label className="ui-field supplier-form__full-width">
          <span className="ui-field__label">Transfer reason</span>
          <input className="ui-input" minLength={5} maxLength={300} name="note" required />
        </label>
        <button
          className="ui-button ui-button--primary"
          disabled={pending || !lots.length || locations.length < 2}
          type="submit"
        >
          Transfer stock
        </button>
      </form>
      <form action={submit} className="supplier-form__grid">
        <input name="action" type="hidden" value="WASTAGE" />
        <h3 className="supplier-form__full-width">Record wastage</h3>
        <label className="ui-field supplier-form__full-width">
          <span className="ui-field__label">Batch</span>
          <select
            className="ui-input"
            name="fromLotId"
            onChange={(event) => setWastageLot(event.target.value)}
            value={wastageLot}
            required
          >
            {lots.map((lot) => (
              <option key={lot.id} value={lot.id}>
                {lot.label}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Quantity</span>
          <input className="ui-input" min="1" name="quantity" required type="number" />
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Reason / evidence reference</span>
          <input className="ui-input" minLength={5} maxLength={300} name="note" required />
        </label>
        <button
          className="ui-button ui-button--primary"
          disabled={pending || !lots.length}
          type="submit"
        >
          Record wastage
        </button>
      </form>
      <form action={submit} className="supplier-form__grid">
        <input name="action" type="hidden" value="WASTAGE_REVERSAL" />
        <h3 className="supplier-form__full-width">Reverse an incorrect wastage entry</h3>
        <label className="ui-field supplier-form__full-width">
          <span className="ui-field__label">Reversible record</span>
          <select
            className="ui-input"
            name="eventId"
            onChange={(event) => setReversal(event.target.value)}
            value={reversal}
            required
          >
            {reversibleWastage.map((event) => (
              <option key={event.eventId} value={event.eventId}>
                {event.label}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field supplier-form__full-width">
          <span className="ui-field__label">Correction reason</span>
          <input className="ui-input" minLength={5} maxLength={300} name="note" required />
        </label>
        <button
          className="ui-button ui-button--secondary"
          disabled={pending || !reversibleWastage.length}
          type="submit"
        >
          Post compensating reversal
        </button>
      </form>
      {message ? <p aria-live="polite">{message}</p> : null}
    </div>
  );
}
