'use client';

import { useState, type FormEvent } from 'react';

interface HotelReviewFormProps {
  hotelSlug: string;
}

interface ReviewApiResponse {
  error?: { message?: string };
}

export function HotelReviewForm({ hotelSlug }: HotelReviewFormProps) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/v1/hotels/${encodeURIComponent(hotelSlug)}/reviews`, {
        body: JSON.stringify({
          body: form.get('body'),
          rating: Number(form.get('rating')),
          title: form.get('title'),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = (await response.json()) as ReviewApiResponse;
      if (!response.ok) {
        setMessage(result.error?.message ?? 'The review could not be saved.');
        return;
      }
      setMessage('Your verified-stay review was submitted for moderation.');
      event.currentTarget.reset();
    } catch {
      setMessage('The review service is unavailable. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="hotel-review-form" onSubmit={submit}>
      <h3>Review a completed stay</h3>
      <p>Sign in with the email used for your booking. Only completed, confirmed stays qualify.</p>
      <label>
        Rating
        <select defaultValue="5" name="rating" required>
          <option value="5">5 - Excellent</option>
          <option value="4">4 - Very good</option>
          <option value="3">3 - Good</option>
          <option value="2">2 - Fair</option>
          <option value="1">1 - Poor</option>
        </select>
      </label>
      <label>
        Review title
        <input maxLength={100} minLength={3} name="title" required />
      </label>
      <label>
        Your experience
        <textarea maxLength={2000} minLength={20} name="body" required rows={5} />
      </label>
      <button className="ui-button ui-button--primary" disabled={submitting} type="submit">
        {submitting ? 'Publishing...' : 'Publish verified review'}
      </button>
      {message ? <p aria-live="polite" className="hotel-review-form__message">{message}</p> : null}
    </form>
  );
}
