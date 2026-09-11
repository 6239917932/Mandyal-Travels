'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse } from '@/types/commerce';

export function AdminPartnerReview({
  applicationId,
  approvalAllowed = true,
  agreementEmailStatus,
  signedAgreementStatus,
}: {
  applicationId: string;
  approvalAllowed?: boolean;
  agreementEmailStatus: string;
  signedAgreementStatus: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function review(
    action: 'APPROVE' | 'REJECT' | 'RECORD_SIGNED_AGREEMENT' | 'RESEND_AGREEMENT',
  ) {
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
      <label className="ui-field" htmlFor={`partner-review-note-${applicationId}`}>
        <span className="ui-field__label">Review note</span>
        <input
          className="ui-input"
          id={`partner-review-note-${applicationId}`}
          maxLength={250}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Required for rejection or signed-agreement receipt"
          value={note}
        />
      </label>
      {agreementEmailStatus === 'FAILED' || agreementEmailStatus === 'PENDING' ? (
        <button
          className="ui-button ui-button--secondary"
          disabled={busy}
          onClick={() => review('RESEND_AGREEMENT')}
          type="button"
        >
          Retry agreement email
        </button>
      ) : null}
      {signedAgreementStatus !== 'RECEIVED' ? (
        <button
          className="ui-button ui-button--secondary"
          disabled={busy || agreementEmailStatus !== 'SENT' || note.trim().length < 5}
          onClick={() => review('RECORD_SIGNED_AGREEMENT')}
          type="button"
        >
          Record complete signed agreement received
        </button>
      ) : (
        <small>Complete signed agreement recorded.</small>
      )}
      <button
        className="ui-button ui-button--primary"
        disabled={busy || !approvalAllowed}
        onClick={() => review('APPROVE')}
        type="button"
      >
        Approve supplier
      </button>
      {!approvalAllowed ? (
        <small>
          Approval is locked until identity evidence and the complete signed agreement are verified.
        </small>
      ) : null}
      <button
        className="ui-button ui-button--secondary"
        disabled={busy || note.trim().length < 3}
        onClick={() => review('REJECT')}
        type="button"
      >
        Reject
      </button>
      {error ? (
        <small className="booking-page__payment-error" role="alert">
          {error}
        </small>
      ) : null}
    </div>
  );
}
