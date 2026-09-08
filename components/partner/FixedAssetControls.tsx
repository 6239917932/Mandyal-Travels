'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';
import {
  HOTEL_FIXED_ASSET_CATEGORIES,
  HOTEL_FIXED_ASSET_EVENTS,
} from '@/lib/pms/fixedAssetCatalog';

type ApiResult = { data?: unknown; error?: { message?: string } };

export function FixedAssetForm({
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
    const response = await fetch('/api/v1/partner/fixed-assets', {
      body: JSON.stringify(Object.fromEntries(formData)),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const result = await readJsonResponse<ApiResult>(response);
    setPending(false);
    if (!response.ok)
      return setMessage(result?.error?.message ?? 'The fixed asset could not be registered.');
    setMessage('Fixed asset registered with immutable opening evidence.');
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
        <span className="ui-field__label">Asset tag</span>
        <input className="ui-input" maxLength={40} name="assetTag" required />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Asset name</span>
        <input className="ui-input" maxLength={120} name="name" required />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Category</span>
        <select className="ui-input" name="category">
          {HOTEL_FIXED_ASSET_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {value.toLowerCase().replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Physical location</span>
        <input className="ui-input" maxLength={120} name="location" required />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Custodian (optional)</span>
        <input className="ui-input" maxLength={120} name="custodian" />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Acquisition date</span>
        <input className="ui-input" name="acquiredOn" required type="date" />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Acquisition cost (INR)</span>
        <input
          className="ui-input"
          max="21474836.47"
          min="0.01"
          name="acquisitionCost"
          required
          step="0.01"
          type="number"
        />
      </label>
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Invoice or ownership reference</span>
        <input className="ui-input" maxLength={100} name="invoiceReference" required />
      </label>
      <button
        className="ui-button ui-button--primary"
        disabled={pending || !properties.length}
        type="submit"
      >
        {pending ? 'Registering…' : 'Register fixed asset'}
      </button>
      {message ? (
        <p aria-live="polite" className="supplier-form__full-width">
          {message}
        </p>
      ) : null}
    </form>
  );
}

export function FixedAssetEventForm({
  assets,
}: {
  assets: Array<{
    custodian: string;
    id: string;
    label: string;
    location: string;
    version: number;
  }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [selectedId, setSelectedId] = useState(assets[0]?.id ?? '');
  const selected = assets.find((asset) => asset.id === selectedId);
  async function submit(formData: FormData) {
    setPending(true);
    setMessage('');
    formData.set('expectedVersion', String(selected?.version ?? 0));
    const response = await fetch('/api/v1/partner/fixed-asset-events', {
      body: JSON.stringify(Object.fromEntries(formData)),
      headers: { 'Content-Type': 'application/json', 'x-idempotency-key': crypto.randomUUID() },
      method: 'POST',
    });
    const result = await readJsonResponse<ApiResult>(response);
    setPending(false);
    if (!response.ok)
      return setMessage(result?.error?.message ?? 'The asset action could not be recorded.');
    setMessage('Asset evidence recorded.');
    router.refresh();
  }
  return (
    <form action={submit} className="supplier-form__grid">
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Asset</span>
        <select
          className="ui-input"
          name="assetId"
          onChange={(event) => setSelectedId(event.target.value)}
          value={selectedId}
          required
        >
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.label}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Action</span>
        <select className="ui-input" name="eventType">
          {HOTEL_FIXED_ASSET_EVENTS.map((value) => (
            <option key={value} value={value}>
              {value.toLowerCase()}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Current or new location</span>
        <input
          className="ui-input"
          defaultValue={selected?.location}
          key={`${selectedId}-location`}
          maxLength={120}
          name="location"
          required
        />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Custodian (optional)</span>
        <input
          className="ui-input"
          defaultValue={selected?.custodian}
          key={`${selectedId}-custodian`}
          maxLength={120}
          name="custodian"
        />
      </label>
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Verification or movement note</span>
        <input className="ui-input" minLength={5} maxLength={300} name="note" required />
      </label>
      <button
        className="ui-button ui-button--primary"
        disabled={pending || !assets.length}
        type="submit"
      >
        {pending ? 'Recording…' : 'Record asset action'}
      </button>
      {message ? (
        <p aria-live="polite" className="supplier-form__full-width">
          {message}
        </p>
      ) : null}
    </form>
  );
}
