'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { inquiryActionsForStatus, type InquiryAction } from '@/lib/admin/contactInquiryRules';
import { readJsonResponse } from '@/lib/api/clientResponse';

const labels: Record<InquiryAction, string> = {
  START_REVIEW: 'Start review',
  ACCEPT: 'Accept request',
  REJECT: 'Reject request',
  CLOSE: 'Close request',
  REOPEN: 'Reopen request',
};
export function AdminContactInquiryReview({
  inquiryId,
  status,
  version,
}: {
  inquiryId: string;
  status: string;
  version: number;
}) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function review(action: InquiryAction) {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(
        `/api/v1/admin/contact-inquiries/${encodeURIComponent(inquiryId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, expectedVersion: version, reason }),
        },
      );
      const result = await readJsonResponse<{
        data?: { status: string };
        error?: { message: string };
      }>(response);
      if (!response.ok || !result?.data) {
        setError(result?.error?.message ?? 'The request could not be updated.');
        return;
      }
      setMessage(
        `Request marked ${result.data.status.replaceAll('_', ' ').toLowerCase()}. Decision recorded.`,
      );
      setReason('');
      router.refresh();
    } catch {
      setError('The review service could not be reached. Your decision has not been confirmed.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="partner-review__controls" aria-label="Request review">
      <label className="ui-field" htmlFor={`inquiry-note-${inquiryId}`}>
        <span className="ui-field__label">Internal decision note (required)</span>
        <textarea
          className="ui-input"
          id={`inquiry-note-${inquiryId}`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          minLength={5}
          maxLength={1000}
          disabled={busy}
          rows={3}
        />
      </label>
      <p>
        Enter at least 5 characters to enable a decision. Notes remain internal; these actions do
        not send email or grant supplier access.
      </p>
      <div className="admin-hero__actions">
        {inquiryActionsForStatus(status).map((action) => (
          <button
            key={action}
            className={`ui-button ui-button--${action === 'ACCEPT' ? 'primary' : 'secondary'}`}
            type="button"
            disabled={busy || reason.trim().length < 5}
            onClick={() => void review(action)}
          >
            {busy ? 'Saving…' : labels[action]}
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="auth-form__error">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="auth-form__success">
          {message}
        </p>
      ) : null}
    </section>
  );
}
