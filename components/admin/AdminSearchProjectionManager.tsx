'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { readJsonResponse } from '@/lib/api/clientResponse';
import { ADMIN_SEARCH_PROJECTION_CONFIRMATION } from '@/services/adminSearchProjectionRules';

type RebuildResponse = {
  data?: { projected: number; removed: number; sourceCount: number };
  error?: string;
};

export function AdminSearchProjectionManager() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [reason, setReason] = useState('');
  const [success, setSuccess] = useState('');

  async function rebuild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setPending(true);
    try {
      const response = await fetch('/api/v1/admin/search-projections', {
        body: JSON.stringify({ confirmation, reason }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = (await readJsonResponse<RebuildResponse>(response)) ?? {};
      if (!response.ok || !result.data) {
        setError(result.error ?? 'The search projection rebuild could not be completed.');
        return;
      }
      setConfirmation('');
      setReason('');
      setSuccess(
        `Rebuilt ${result.data.projected} hotel projections and removed ${result.data.removed} stale records.`,
      );
      router.refresh();
    } catch {
      setError('The search operations service could not be reached. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="ui-card supplier-form" onSubmit={rebuild}>
      <div>
        <p className="hotel-page__eyebrow">Controlled maintenance</p>
        <h2>Rebuild hotel search projections</h2>
        <p id="search-rebuild-boundary">
          This refreshes a disposable search read model. It never changes rates, availability,
          inventory, bookings, supplier records, or payment data.
        </p>
      </div>
      <label>
        Operational reason
        <textarea
          aria-describedby="search-rebuild-boundary"
          maxLength={500}
          minLength={10}
          onChange={(event) => setReason(event.target.value)}
          required
          value={reason}
        />
      </label>
      <label>
        Type <strong>{ADMIN_SEARCH_PROJECTION_CONFIRMATION}</strong> to confirm
        <input
          autoComplete="off"
          onChange={(event) => setConfirmation(event.target.value)}
          required
          value={confirmation}
        />
      </label>
      <Button isLoading={pending} type="submit">
        Rebuild search projections
      </Button>
      {success ? (
        <p className="business-policy__success" role="status">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="auth-form__error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
