'use client';

import { useState } from 'react';

export function AdminHotelReviewAction({ reviewId }: { reviewId: string }) {
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function moderate(action: 'PUBLISH' | 'REJECT') {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/v1/admin/hotel-reviews/${reviewId}`, {
        body: JSON.stringify({ action, note }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setMessage(result.error?.message ?? 'The review decision could not be saved.');
        return;
      }
      window.location.reload();
    } catch {
      setMessage('The moderation service is unavailable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="review-governance__action">
      <textarea
        aria-label="Moderation note"
        maxLength={500}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Moderation note (required when rejecting)"
        value={note}
      />
      <div>
        <button
          className="ui-button ui-button--primary ui-button--small"
          disabled={busy}
          onClick={() => moderate('PUBLISH')}
          type="button"
        >
          Publish
        </button>
        <button
          className="ui-button ui-button--secondary ui-button--small"
          disabled={busy}
          onClick={() => moderate('REJECT')}
          type="button"
        >
          Reject
        </button>
      </div>
      {message ? <p aria-live="polite">{message}</p> : null}
    </div>
  );
}
