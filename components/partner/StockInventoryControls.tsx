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
