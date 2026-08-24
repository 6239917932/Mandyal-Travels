'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';

interface HotelReviewFormProps {
  bookingReference?: string;
  hotelSlug: string;
}

interface ReviewApiResponse {
  error?: { message?: string };
}

export function HotelReviewForm({ bookingReference, hotelSlug }: HotelReviewFormProps) {
  const router = useRouter();
  const descriptionId = useId();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!bookingReference) {
    return (
      <div className="hotel-review-form">
        <h3>Review a completed stay</h3>
        <p>Open your private review center to select an exact checked-out booking.</p>
        <Link className="ui-button ui-button--secondary" href="/account/reviews">
          Open my stay reviews
        </Link>
      </div>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSubmitting(true);
    setError('');
    setMessage('');
    const form = new FormData(formElement);
    try {
      const response = await fetch(`/api/v1/hotels/${encodeURIComponent(hotelSlug)}/reviews`, {
        body: JSON.stringify({
          body: form.get('body'),
          bookingReference,
          rating: Number(form.get('rating')),
          title: form.get('title'),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = (await readJsonResponse<ReviewApiResponse>(response)) ?? {};
      if (!response.ok) {
        setError(result.error?.message ?? 'The review could not be saved.');
        return;
      }
      setMessage('Your verified-stay review was submitted for moderation.');
      formElement.reset();
      router.refresh();
    } catch {
      setError('The review service is unavailable. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form aria-describedby={descriptionId} className="hotel-review-form" onSubmit={submit}>
      <h3>Review a completed stay</h3>
      <p id={descriptionId}>
        Booking {bookingReference} is checked out and confirmed under your signed-in email. Your
        review remains private until human moderation.
      </p>
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
        {submitting ? 'Submitting…' : 'Submit verified-stay review'}
      </button>
      {error ? (
        <p className="auth-form__error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="hotel-review-form__message" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
