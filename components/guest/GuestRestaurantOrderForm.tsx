'use client';

import { useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse } from '@/types/commerce';

type MenuItem = {
  category: string;
  currency: string;
  description: string;
  id: string;
  name: string;
  unitPrice: number;
  vegetarian: boolean;
};
type Outlet = { id: string; menuItems: readonly MenuItem[]; name: string; serviceArea: string };

function retryKey() {
  return crypto.randomUUID();
}

function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { currency, style: 'currency' }).format(amount);
}

export function GuestRestaurantOrderForm({
  confirmationCode,
  outlets,
}: {
  confirmationCode: string;
  outlets: readonly Outlet[];
}) {
  const [outletId, setOutletId] = useState(outlets[0]?.id ?? '');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [saving, setSaving] = useState(false);
  const idempotencyKey = useRef(retryKey());
  const outlet = outlets.find((candidate) => candidate.id === outletId);
  const selected = useMemo(
    () =>
      (outlet?.menuItems ?? [])
        .filter((item) => (quantities[item.id] ?? 0) > 0)
        .map((item) => ({ menuItemId: item.id, quantity: quantities[item.id] })),
    [outlet, quantities],
  );
  const total = (outlet?.menuItems ?? []).reduce(
    (sum, item) => sum + item.unitPrice * (quantities[item.id] ?? 0),
    0,
  );

  async function submit() {
    setError(undefined);
    setSuccess(undefined);
    if (!selected.length) {
      setError('Choose at least one menu item.');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/v1/guest/restaurant-orders', {
        body: JSON.stringify({ confirmationCode, items: selected, note, outletId }),
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey.current,
        },
        method: 'POST',
      });
      const result = await readJsonResponse<
        { data: { id: string; status: string } } | ApiErrorResponse
      >(response);
      if (!response.ok || !result || !('data' in result)) {
        setError(result && 'error' in result ? result.error.message : 'The order was not placed.');
        return;
      }
      setSuccess(`Order ${result.data.id} was sent to the kitchen.`);
      setQuantities({});
      setNote('');
      idempotencyKey.current = retryKey();
    } catch {
      setError('The order service could not be reached. You can safely retry.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="supplier-form__grid">
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Restaurant outlet</span>
        <select
          className="ui-input"
          onChange={(event) => {
            setOutletId(event.target.value);
            setQuantities({});
          }}
          value={outletId}
        >
          {outlets.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
              {candidate.serviceArea ? ` · ${candidate.serviceArea}` : ''}
            </option>
          ))}
        </select>
      </label>
      {(outlet?.menuItems ?? []).map((item) => (
        <div className="ui-card ui-card--padded" key={item.id}>
          <p className="hotel-page__eyebrow">{item.category}</p>
          <h3>{item.name}</h3>
          <p>{item.description || (item.vegetarian ? 'Vegetarian' : 'Restaurant selection')}</p>
          <strong>{money(item.unitPrice, item.currency)}</strong>
          <Input
            label="Quantity"
            max={20}
            min={0}
            onChange={(event) =>
              setQuantities((current) => ({
                ...current,
                [item.id]: Math.max(0, Math.min(20, Number(event.target.value) || 0)),
              }))
            }
            type="number"
            value={quantities[item.id] ?? 0}
          />
        </div>
      ))}
      <Input
        className="supplier-form__full-width"
        label="Preparation note (optional)"
        maxLength={240}
        onChange={(event) => setNote(event.target.value)}
        value={note}
      />
      {error ? (
        <p className="booking-page__payment-error supplier-form__full-width" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="booking-page__payment-success supplier-form__full-width" role="status">
          {success}
        </p>
      ) : null}
      <Button disabled={!outlets.length} fullWidth isLoading={saving} onClick={submit}>
        Send order · {money(total, outlet?.menuItems[0]?.currency ?? 'INR')}
      </Button>
    </div>
  );
}
