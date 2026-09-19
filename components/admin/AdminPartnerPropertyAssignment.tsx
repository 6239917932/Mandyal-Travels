'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { readJsonResponse } from '@/lib/api/clientResponse';
import { inventorySourceLabel } from '@/lib/inventory/sourceLabels';
import type { ApiErrorResponse } from '@/types/commerce';
import type { HotelInventorySource } from '@/types/hotel';

export function AdminPartnerPropertyAssignment({
  hotels,
  partnerId,
}: {
  hotels: Array<{ inventorySource: HotelInventorySource; name: string; slug: string }>;
  partnerId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || hotels.length === 0) return;
    setBusy(true);
    setError(undefined);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/v1/admin/partners/${partnerId}`, {
        body: JSON.stringify({ action: 'ASSIGN_HOTEL', hotelSlug: form.get('hotelSlug') }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = await readJsonResponse<{ data: unknown } | ApiErrorResponse>(response);
      if (!response.ok)
        setError(result && 'error' in result ? result.error.message : 'Hotel assignment failed.');
      else router.refresh();
    } catch {
      setError('The assignment service could not be reached. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="supplier-assignment" onSubmit={submit}>
      <label className="ui-field">
        <span className="ui-field__label">Hotel inventory source</span>
        <select
          className="ui-input"
          name="hotelSlug"
          required
          disabled={busy || hotels.length === 0}
        >
          <option value="">Choose hotel</option>
          {hotels.map((hotel) => (
            <option key={hotel.slug} value={hotel.slug}>
              {hotel.name} — {inventorySourceLabel(hotel.inventorySource)}
            </option>
          ))}
        </select>
      </label>
      <Button disabled={hotels.length === 0} isLoading={busy} type="submit" variant="primary">
        Assign hotel
      </Button>
      {hotels.length === 0 ? (
        <small>
          No unassigned platform hotel is available. Supplier-created hotels are managed in their
          own workspace.
        </small>
      ) : null}
      {error ? (
        <small className="booking-page__payment-error" role="alert">
          {error}
        </small>
      ) : null}
    </form>
  );
}
