'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse } from '@/types/commerce';

export function AdminPartnerReview({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function review(action: 'APPROVE' | 'REJECT') {
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/v1/admin/partner-applications/${applicationId}`, {
        body: JSON.stringify({ action, reviewNote: note }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = await readJsonResponse<{ data: unknown } | ApiErrorResponse>(response);
      if (!response.ok) {
        setError(result && 'error' in result ? result.error.message : 'Review failed.');
        return;
      }
      router.refresh();
    } catch {
      setError('The review service could not be reached.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="partner-review__controls">
      <input
        className="ui-input"
        maxLength={250}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Review note (required for rejection)"
        value={note}
      />
      <button
        className="ui-button ui-button--primary"
        disabled={busy}
        onClick={() => review('APPROVE')}
        type="button"
      >
        Approve supplier
      </button>
      <button
        className="ui-button ui-button--secondary"
        disabled={busy || note.trim().length < 3}
        onClick={() => review('REJECT')}
        type="button"
      >
        Reject
      </button>
      {error ? <small className="booking-page__payment-error">{error}</small> : null}
    </div>
  );
}
