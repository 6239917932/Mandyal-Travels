'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse } from '@/types/commerce';

export function AdminPartnerPropertyAssignment({
  hotels,
  partnerId,
}: {
  hotels: Array<{ name: string; slug: string }>;
  partnerId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/v1/admin/partners/${partnerId}`, {
      body: JSON.stringify({ action: 'ASSIGN_HOTEL', hotelSlug: form.get('hotelSlug') }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    });
    const result = await readJsonResponse<{ data: unknown } | ApiErrorResponse>(response);
    if (!response.ok)
      setError(result && 'error' in result ? result.error.message : 'Hotel assignment failed.');
    else router.refresh();
    setBusy(false);
  }
  return (
    <form className="supplier-assignment" onSubmit={submit}>
      <label className="ui-field">
        <span className="ui-field__label">Hotel inventory source</span>
        <select className="ui-input" name="hotelSlug" required>
          <option value="">Choose hotel</option>
          {hotels.map((hotel) => (
            <option key={hotel.slug} value={hotel.slug}>
              {hotel.name}
            </option>
          ))}
        </select>
      </label>
      <Button isLoading={busy} type="submit" variant="primary">
        Assign hotel
      </Button>
      {error ? <small className="booking-page__payment-error">{error}</small> : null}
    </form>
  );
}
