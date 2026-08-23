'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';

type ResponseBody = { error?: string };

export function AdminPromotionCreateForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function create(formData: FormData) {
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/v1/admin/promotions', {
        body: JSON.stringify({
          code: formData.get('code'),
          description: formData.get('description'),
          endsAt: formData.get('endsAt'),
          maximumDiscount: Number(formData.get('maximumDiscount')),
          minimumSubtotal: Number(formData.get('minimumSubtotal')),
          name: formData.get('name'),
          percentOff: Number(formData.get('percentOff')),
          products: formData.getAll('products'),
          startsAt: formData.get('startsAt'),
          usageLimit: formData.get('usageLimit'),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = (await readJsonResponse<ResponseBody>(response)) ?? {};
      if (!response.ok) setError(result.error ?? 'Campaign creation failed.');
      else router.refresh();
    } catch {
      setError('The promotions service could not be reached.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={create} className="supplier-form">
      <div className="supplier-form__grid">
        <label>
          Campaign name
          <input maxLength={120} minLength={3} name="name" required />
        </label>
        <label>
          Coupon code
          <input maxLength={30} minLength={3} name="code" pattern="[A-Za-z0-9_-]+" required />
        </label>
        <label>
          Percent off
          <input max={100} min={1} name="percentOff" type="number" required />
        </label>
        <label>
          Maximum discount (minor units)
          <input min={1} name="maximumDiscount" type="number" required />
        </label>
        <label>
          Minimum subtotal (minor units)
          <input min={1} name="minimumSubtotal" type="number" required />
        </label>
        <label>
          Reserved usage cap (activation blocked until redemption tracking exists)
          <input min={1} name="usageLimit" type="number" />
        </label>
        <label>
          Starts at
          <input name="startsAt" type="datetime-local" required />
        </label>
        <label>
          Ends at
          <input name="endsAt" type="datetime-local" required />
        </label>
      </div>
      <fieldset>
        <legend>Eligible products</legend>
        {['HOTEL', 'FLIGHT', 'BUS', 'CAR'].map((product) => (
          <label key={product}>
            <input name="products" type="checkbox" value={product} /> {product}
          </label>
        ))}
      </fieldset>
      <label>
        Description
        <textarea maxLength={500} name="description" />
      </label>
      <button className="ui-button ui-button--primary" disabled={pending}>
        {pending ? 'Saving…' : 'Create paused campaign'}
      </button>
      {error ? (
        <span className="auth-form__error" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}

export function AdminPromotionStatus({
  active,
  campaignId,
  version,
}: {
  active: boolean;
  campaignId: string;
  version: number;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function update(formData: FormData) {
    setPending(true);
    setError('');
    try {
      const response = await fetch(`/api/v1/admin/promotions/${encodeURIComponent(campaignId)}`, {
        body: JSON.stringify({
          active: !active,
          expectedVersion: version,
          reason: formData.get('reason'),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = (await readJsonResponse<ResponseBody>(response)) ?? {};
      if (!response.ok) setError(result.error ?? 'Campaign update failed.');
      else router.refresh();
    } catch {
      setError('The promotions service could not be reached.');
    } finally {
      setPending(false);
    }
  }
  return (
    <form action={update} className="admin-finance-actions__form">
      <label>
        Required change reason
        <textarea maxLength={500} minLength={10} name="reason" required />
      </label>
      <button className="ui-button ui-button--secondary" disabled={pending}>
        {pending ? 'Saving…' : active ? 'Pause' : 'Activate'}
      </button>
      {error ? (
        <span className="auth-form__error" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}
