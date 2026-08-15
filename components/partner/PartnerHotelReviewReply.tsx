'use client';

import { useState } from 'react';

export function PartnerHotelReviewReply({ reviewId }: { reviewId: string }) {
  const [reply, setReply] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/v1/partner/hotel-reviews/${reviewId}`, {
        body: JSON.stringify({ reply }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setMessage(result.error?.message ?? 'The property response could not be saved.');
        return;
      }
      window.location.reload();
    } catch {
      setMessage('The response service is unavailable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="review-governance__action">
      <textarea
        maxLength={1000}
        minLength={10}
        onChange={(event) => setReply(event.target.value)}
        placeholder="Write a professional property response"
        value={reply}
      />
      <button
        className="ui-button ui-button--primary ui-button--small"
        disabled={busy}
        onClick={submit}
        type="button"
      >
        Publish response
      </button>
      {message ? <p aria-live="polite">{message}</p> : null}
    </div>
  );
}
