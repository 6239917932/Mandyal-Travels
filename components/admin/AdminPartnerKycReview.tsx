'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { partnerKycStorageReadiness } from '@/lib/partner/kycPersistenceRules';

type TargetStatus = 'CHANGES_REQUESTED' | 'REJECTED' | 'REVOKED' | 'UNDER_REVIEW' | 'VERIFIED';

export function AdminPartnerKycReview(props: {
  documentId: string;
  lockVersion: number;
  status: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function transition(targetStatus: TargetStatus) {
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/v1/admin/partner-kyc-documents/${props.documentId}`, {
        body: JSON.stringify({
          expectedVersion: props.lockVersion,
          reviewNote: note,
          targetStatus,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message =
          payload &&
          typeof payload === 'object' &&
          'error' in payload &&
          typeof payload.error === 'string'
            ? payload.error
            : 'Review could not be saved.';
        setError(message);
        return;
      }
      router.refresh();
    } catch {
      setError('The review service could not be reached.');
    } finally {
      setBusy(false);
    }
  }

  const firstReview = props.status === 'SUBMITTED';
  const verificationReady = partnerKycStorageReadiness({}).ready;
  return (
    <div className="partner-review__controls">
      <label className="ui-field">
        <span className="ui-field__label">Review note</span>
        <input
          className="ui-input"
          maxLength={500}
          onChange={(event) => setNote(event.target.value)}
          value={note}
        />
      </label>
      {firstReview ? (
        <button
          className="ui-button ui-button--primary"
          disabled={busy}
          onClick={() => transition('UNDER_REVIEW')}
          type="button"
        >
          Start review
        </button>
      ) : null}
      {props.status === 'UNDER_REVIEW' ? (
        <>
          <button
            className="ui-button ui-button--primary"
            disabled={busy || !verificationReady || note.trim().length < 10}
            onClick={() => transition('VERIFIED')}
            type="button"
          >
            Verify
          </button>
          {!verificationReady ? (
            <small>
              Verify is locked until secure evidence storage, scanning and audited document access
              are activated. Enter a note of at least 10 characters to request changes or reject.
            </small>
          ) : null}
          <button
            className="ui-button ui-button--secondary"
            disabled={busy || note.trim().length < 10}
            onClick={() => transition('CHANGES_REQUESTED')}
            type="button"
          >
            Request changes
          </button>
          <button
            className="ui-button ui-button--secondary"
            disabled={busy || note.trim().length < 10}
            onClick={() => transition('REJECTED')}
            type="button"
          >
            Reject
          </button>
        </>
      ) : null}
      {props.status === 'VERIFIED' ? (
        <button
          className="ui-button ui-button--secondary"
          disabled={busy || note.trim().length < 10}
          onClick={() => transition('REVOKED')}
          type="button"
        >
          Revoke verification
        </button>
      ) : null}
      {!['SUBMITTED', 'UNDER_REVIEW', 'VERIFIED'].includes(props.status) ? (
        <small>
          This record is {props.status.toLowerCase().replaceAll('_', ' ')}. The applicant must
          submit a new document version before further review.
        </small>
      ) : null}
      {error ? (
        <small className="booking-page__payment-error" role="alert">
          {error}
        </small>
      ) : null}
    </div>
  );
}
