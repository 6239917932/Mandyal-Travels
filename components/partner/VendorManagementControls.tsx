'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';
import { HOTEL_VENDOR_CATEGORIES, HOTEL_VENDOR_STATUSES } from '@/lib/pms/vendorCatalog';

type ApiResult = { data?: unknown; error?: { message?: string } };

export function VendorRegistrationForm({
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
    try {
      const response = await fetch('/api/v1/partner/vendors', {
        body: JSON.stringify(Object.fromEntries(formData)),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = await readJsonResponse<ApiResult>(response);
      if (!response.ok)
        return setMessage(result?.error?.message ?? 'The vendor could not be registered.');
      setMessage('Vendor registered with immutable opening evidence.');
      router.refresh();
    } catch {
      setMessage('The vendor service could not be reached. You can safely retry.');
    } finally {
      setPending(false);
    }
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
        <span className="ui-field__label">Vendor code</span>
        <input className="ui-input" maxLength={30} name="vendorCode" required />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Legal business name</span>
        <input className="ui-input" maxLength={140} name="legalName" required />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Trading name (optional)</span>
        <input className="ui-input" maxLength={140} name="tradingName" />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Category</span>
        <select className="ui-input" name="category" required>
          {HOTEL_VENDOR_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {value.toLowerCase().replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Primary contact</span>
        <input className="ui-input" maxLength={120} name="contactName" required />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Business email</span>
        <input className="ui-input" maxLength={160} name="email" type="email" />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Business phone</span>
        <input className="ui-input" maxLength={24} name="phone" type="tel" />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Payment terms (days)</span>
        <input
          className="ui-input"
          defaultValue={0}
          max={365}
          min={0}
          name="paymentTermsDays"
          required
          type="number"
        />
      </label>
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Commercial note (optional)</span>
        <input className="ui-input" maxLength={300} name="commercialNote" />
      </label>
      <button
        className="ui-button ui-button--primary"
        disabled={pending || !properties.length}
        type="submit"
      >
        {pending ? 'Registering…' : 'Register vendor'}
      </button>
      {message ? (
        <p aria-live="polite" className="supplier-form__full-width">
          {message}
        </p>
      ) : null}
    </form>
  );
}

export function VendorStatusForm({
  vendors,
}: {
  vendors: Array<{ id: string; label: string; status: string; version: number }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [selectedId, setSelectedId] = useState(vendors[0]?.id ?? '');
  const selected = vendors.find((vendor) => vendor.id === selectedId);
  async function submit(formData: FormData) {
    setPending(true);
    setMessage('');
    formData.set('expectedVersion', String(selected?.version ?? 0));
    try {
      const response = await fetch('/api/v1/partner/vendor-status', {
        body: JSON.stringify(Object.fromEntries(formData)),
        headers: { 'Content-Type': 'application/json', 'x-idempotency-key': crypto.randomUUID() },
        method: 'POST',
      });
      const result = await readJsonResponse<ApiResult>(response);
      if (!response.ok)
        return setMessage(result?.error?.message ?? 'The vendor status could not be changed.');
      setMessage('Vendor status changed with immutable evidence.');
      router.refresh();
    } catch {
      setMessage('The vendor service could not be reached. You can safely retry.');
    } finally {
      setPending(false);
    }
  }
  return (
    <form action={submit} className="supplier-form__grid">
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Vendor</span>
        <select
          className="ui-input"
          name="vendorId"
          onChange={(event) => setSelectedId(event.target.value)}
          value={selectedId}
          required
        >
          {vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.label}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">New status</span>
        <select
          className="ui-input"
          defaultValue={selected?.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'}
          key={selectedId}
          name="status"
        >
          {HOTEL_VENDOR_STATUSES.filter((status) => status !== selected?.status).map((status) => (
            <option key={status} value={status}>
              {status.toLowerCase()}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Reason</span>
        <input className="ui-input" maxLength={300} minLength={8} name="note" required />
      </label>
      <button
        className="ui-button ui-button--secondary"
        disabled={pending || !vendors.length}
        type="submit"
      >
        {pending ? 'Recording…' : 'Change vendor status'}
      </button>
      {message ? (
        <p aria-live="polite" className="supplier-form__full-width">
          {message}
        </p>
      ) : null}
    </form>
  );
}
