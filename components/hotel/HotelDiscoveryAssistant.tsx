'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import type { HotelDiscoverySuggestion, HotelSearchCriteria } from '@/types/hotel';

interface DiscoveryResponse {
  data?: HotelDiscoverySuggestion;
  error?: { message?: string };
}

export function HotelDiscoveryAssistant({ criteria }: { criteria: HotelSearchCriteria }) {
  const router = useRouter();
  const [intent, setIntent] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/v1/hotels/discovery', {
        body: JSON.stringify({ intent }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = (await response.json()) as DiscoveryResponse;
      if (!response.ok || !result.data) {
        setMessage(result.error?.message ?? 'The discovery assistant could not interpret that request.');
        return;
      }
      const query = new URLSearchParams({
        adults: String(criteria.adults),
        amenity: result.data.filters.amenity,
        checkInDate: criteria.checkInDate,
        checkOutDate: criteria.checkOutDate,
        children: String(criteria.children),
        destination: result.data.normalizedDestination,
        maximumNightlyRate: String(result.data.filters.maximumNightlyRate),
        minimumStarRating: String(result.data.filters.minimumStarRating),
        rooms: String(criteria.rooms),
        sort: result.data.filters.sort,
      });
      if (result.data.filters.refundableOnly) query.set('refundableOnly', 'true');
      window.sessionStorage.setItem('mandyal-hotel-discovery-explanation', result.data.explanation);
      router.push(`/hotels?${query.toString()}`);
    } catch {
      setMessage('The discovery assistant is unavailable. Use the standard filters below.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="hotel-discovery" onSubmit={submit}>
      <div>
        <p className="hotel-page__eyebrow">AI-ready guided discovery</p>
        <h2>Describe the stay you want</h2>
        <p>Example: “A refundable 4-star hotel in Jaipur with parking under ₹7,000.”</p>
      </div>
      <div className="hotel-discovery__controls">
        <label className="ui-field">
          <span className="ui-field__label">Travel intent</span>
          <input className="ui-input" maxLength={300} minLength={3} onChange={(event) => setIntent(event.target.value)} placeholder="Tell us your destination, budget, rating, or amenities" required value={intent} />
        </label>
        <button className="ui-button ui-button--primary" disabled={busy} type="submit">{busy ? 'Interpreting...' : 'Find matching stays'}</button>
      </div>
      <small>Recommendations only set search filters. Availability and prices always come from the live inventory and quote engines.</small>
      {message ? <p aria-live="polite" className="hotel-discovery__message">{message}</p> : null}
    </form>
  );
}
