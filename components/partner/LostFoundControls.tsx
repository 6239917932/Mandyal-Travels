'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';

type ApiResult = { data?: unknown; error?: { message?: string } };

export function LostFoundItemForm({
  maximumFoundDate,
  properties,
}: {
  maximumFoundDate: string;
  properties: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(formData: FormData) {
    setPending(true);
    setMessage('');
    const response = await fetch('/api/v1/partner/lost-found', {
      body: JSON.stringify(Object.fromEntries(formData)),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const result = await readJsonResponse<ApiResult>(response);
    setPending(false);
    if (!response.ok)
      return setMessage(result?.error?.message ?? 'The custody item could not be registered.');
    setMessage('Item registered with immutable custody evidence.');
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
        <span className="ui-field__label">Custody reference</span>
        <input className="ui-input" maxLength={40} name="referenceCode" required />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Item name</span>
        <input className="ui-input" maxLength={120} name="itemName" required />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Found on</span>
        <input className="ui-input" max={maximumFoundDate} name="foundOn" required type="date" />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Found at</span>
        <input className="ui-input" maxLength={120} name="foundLocation" required />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Secure storage location</span>
        <input className="ui-input" maxLength={120} name="storageLocation" required />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Received from / found by</span>
        <input className="ui-input" maxLength={120} name="foundBy" required />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Reservation reference (optional)</span>
        <input className="ui-input" maxLength={80} name="reservationReference" />
      </label>
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Identifying description</span>
        <textarea className="ui-input" maxLength={500} minLength={5} name="description" required />
      </label>
      <button
        className="ui-button ui-button--primary"
        disabled={pending || !properties.length}
        type="submit"
      >
        {pending ? 'Registering…' : 'Register custody item'}
      </button>
      {message ? (
        <p aria-live="polite" className="supplier-form__full-width">
          {message}
        </p>
      ) : null}
    </form>
  );
}

export function LostFoundEventForm({
  items,
  canDispose,
}: {
  canDispose: boolean;
  items: Array<{ id: string; label: string; status: string; version: number }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? '');
  const [toStatus, setToStatus] = useState('MATCHED');
  const selected = items.find((item) => item.id === selectedId);
  const choices =
    selected?.status === 'MATCHED' ? ['IN_CUSTODY', 'RETURNED'] : ['MATCHED', 'RETURNED'];
  if (canDispose) choices.push('DISPOSED');

  async function submit(formData: FormData) {
    setPending(true);
    setMessage('');
    formData.set('expectedVersion', String(selected?.version ?? 0));
    const response = await fetch('/api/v1/partner/lost-found-events', {
      body: JSON.stringify(Object.fromEntries(formData)),
      headers: { 'Content-Type': 'application/json', 'x-idempotency-key': crypto.randomUUID() },
      method: 'POST',
    });
    const result = await readJsonResponse<ApiResult>(response);
    setPending(false);
    if (!response.ok)
      return setMessage(result?.error?.message ?? 'The custody action could not be recorded.');
    setMessage('Custody status and immutable evidence recorded.');
    router.refresh();
  }

  return (
    <form action={submit} className="supplier-form__grid">
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Open custody item</span>
        <select
          className="ui-input"
          name="itemId"
          onChange={(event) => setSelectedId(event.target.value)}
          value={selectedId}
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
        <span className="ui-field__label">Next status</span>
        <select
          className="ui-input"
          name="toStatus"
          onChange={(event) => setToStatus(event.target.value)}
          value={toStatus}
        >
          {choices.map((choice) => (
            <option key={choice} value={choice}>
              {choice.toLowerCase().replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">
          Released to {toStatus === 'RETURNED' ? '(required)' : '(if applicable)'}
        </span>
        <input
          className="ui-input"
          maxLength={120}
          name="releasedTo"
          required={toStatus === 'RETURNED'}
        />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Evidence / authorization reference</span>
        <input
          className="ui-input"
          maxLength={100}
          name="releaseEvidenceReference"
          required={toStatus === 'RETURNED' || toStatus === 'DISPOSED'}
        />
      </label>
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Reason and verification note</span>
        <textarea className="ui-input" maxLength={500} minLength={5} name="note" required />
      </label>
      <button
        className="ui-button ui-button--primary"
        disabled={pending || !items.length}
        type="submit"
      >
        {pending ? 'Recording…' : 'Record custody action'}
      </button>
      {message ? (
        <p aria-live="polite" className="supplier-form__full-width">
          {message}
        </p>
      ) : null}
    </form>
  );
}
