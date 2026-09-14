'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';
import {
  HOTEL_BOOKING_ADDON_CATEGORIES,
  HOTEL_BOOKING_ADDON_PRICING_MODES,
} from '@/lib/pms/bookingAddons';

type Result = { error?: { message?: string } };

export function BookingAddonCreateForm({
  properties,
}: {
  properties: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(formData: FormData) {
    setPending(true);
    setMessage('');
    try {
      const payload = Object.fromEntries(formData);
      payload.taxRateBps = String(Math.round(Number(payload.taxRatePercent ?? 0) * 100));
      delete payload.taxRatePercent;
      const response = await fetch('/api/v1/partner/booking-addons', {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = await readJsonResponse<Result>(response);
      if (!response.ok)
        return setMessage(result?.error?.message ?? 'The package could not be created.');
      setMessage('Package published for new quotes.');
      router.refresh();
    } catch {
      setMessage('The package service could not be reached. You can safely retry.');
    } finally {
      setPending(false);
    }
  }
  return (
    <form action={submit} className="supplier-form__grid">
      <label className="ui-field supplier-form__full-width">
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
        <span className="ui-field__label">Name</span>
        <input
          className="ui-input"
          maxLength={100}
          name="name"
          placeholder="Breakfast buffet"
          required
        />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Category</span>
        <select className="ui-input" name="category">
          {HOTEL_BOOKING_ADDON_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category.toLowerCase().replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Pricing basis</span>
        <select className="ui-input" name="pricingMode">
          {HOTEL_BOOKING_ADDON_PRICING_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode.toLowerCase().replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Unit price (₹)</span>
        <input
          className="ui-input"
          min={1}
          max={1000000}
          name="unitAmount"
          type="number"
          required
        />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">GST/tax rate (%)</span>
        <input
          className="ui-input"
          defaultValue={0}
          min={0}
          max={100}
          name="taxRatePercent"
          step="0.01"
          type="number"
        />
        <small>Enter the rate applicable to this service; verify it with your tax adviser.</small>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Minimum quantity</span>
        <input
          className="ui-input"
          defaultValue={1}
          min={1}
          max={100}
          name="minQuantity"
          type="number"
          required
        />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Maximum quantity</span>
        <input
          className="ui-input"
          defaultValue={1}
          min={1}
          max={100}
          name="maxQuantity"
          type="number"
          required
        />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Available from (optional)</span>
        <input className="ui-input" name="startsOn" type="date" />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Available until (optional)</span>
        <input className="ui-input" name="endsOn" type="date" />
      </label>
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Guest-facing description</span>
        <textarea
          className="ui-input supplier-form__textarea"
          maxLength={400}
          name="description"
          required
        />
      </label>
      <button
        className="ui-button ui-button--primary"
        disabled={pending || !properties.length}
        type="submit"
      >
        {pending ? 'Publishing…' : 'Publish package'}
      </button>
      {message ? (
        <p aria-live="polite" className="supplier-form__full-width">
          {message}
        </p>
      ) : null}
    </form>
  );
}

export function BookingAddonStatusButton({
  addon,
}: {
  addon: { id: string; status: string; version: number };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function change() {
    setPending(true);
    setMessage('');
    try {
      const response = await fetch('/api/v1/partner/booking-addons', {
        body: JSON.stringify({
          action: 'status',
          addonId: addon.id,
          expectedVersion: addon.version,
          status: addon.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = await readJsonResponse<Result>(response);
      if (!response.ok) return setMessage(result?.error?.message ?? 'Status could not be changed.');
      router.refresh();
    } catch {
      setMessage('The service could not be reached. You can safely retry.');
    } finally {
      setPending(false);
    }
  }
  return (
    <div>
      <button
        className="ui-button ui-button--secondary"
        disabled={pending}
        onClick={change}
        type="button"
      >
        {pending ? 'Saving…' : addon.status === 'ACTIVE' ? 'Pause' : 'Activate'}
      </button>
      {message ? <small aria-live="polite">{message}</small> : null}
    </div>
  );
}
