'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { TripPlannerResult } from '@/types/ai';

const INTERESTS = [
  'Nature',
  'Culture',
  'Food',
  'Adventure',
  'Wellness',
  'Family activities',
] as const;
type PlannerResponse = { data?: TripPlannerResult; error?: { message?: string } };

export function TripPlanner() {
  const [interests, setInterests] = useState<string[]>([]);
  const [result, setResult] = useState<TripPlannerResult | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setResult(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/v1/ai/trip-plans', {
        body: JSON.stringify({
          adults: Number(form.get('adults')),
          checkInDate: form.get('checkInDate'),
          checkOutDate: form.get('checkOutDate'),
          destination: form.get('destination'),
          destinationAirport: form.get('destinationAirport'),
          interests,
          origin: form.get('origin'),
          originAirport: form.get('originAirport'),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const payload = (await response.json()) as PlannerResponse;
      if (!response.ok || !payload.data) {
        setMessage(payload.error?.message ?? 'The planner could not create this trip.');
        return;
      }
      setResult(payload.data);
    } catch {
      setMessage(
        'The planner is temporarily unavailable. You can still search each travel product directly.',
      );
    } finally {
      setBusy(false);
    }
  }

  function toggleInterest(value: string) {
    setInterests((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  return (
    <div className="trip-planner">
      <form className="trip-planner__form" onSubmit={submit}>
        <div className="trip-planner__grid">
          <Input
            label="Starting from"
            maxLength={100}
            minLength={2}
            name="origin"
            placeholder="Delhi"
            required
          />
          <Input
            label="Destination"
            maxLength={100}
            minLength={2}
            name="destination"
            placeholder="Bir Billing"
            required
          />
          <Input label="Check-in date" name="checkInDate" required type="date" />
          <Input label="Check-out date" name="checkOutDate" required type="date" />
          <Input
            defaultValue="2"
            label="Adults"
            max={9}
            min={1}
            name="adults"
            required
            type="number"
          />
          <div className="trip-planner__airports">
            <Input
              label="Origin airport (optional)"
              maxLength={3}
              name="originAirport"
              placeholder="DEL"
            />
            <Input
              label="Destination airport (optional)"
              maxLength={3}
              name="destinationAirport"
              placeholder="DHM"
            />
          </div>
        </div>
        <fieldset className="trip-planner__interests">
          <legend>What interests you?</legend>
          <div>
            {INTERESTS.map((interest) => (
              <label key={interest}>
                <input
                  checked={interests.includes(interest)}
                  onChange={() => toggleInterest(interest)}
                  type="checkbox"
                />
                <span>{interest}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Button isLoading={busy} size="large" type="submit">
          Create editable plan
        </Button>
        {message ? (
          <p aria-live="polite" className="trip-planner__error">
            {message}
          </p>
        ) : null}
      </form>

      {result ? (
        <section aria-live="polite" className="trip-planner__result">
          <h2>Your suggested trip</h2>
          <p>{result.summary}</p>
          <p className="trip-planner__disclosure">{result.disclosure}</p>
          <div className="trip-planner__days">
            {result.days.map((day) => (
              <article key={`${day.day}-${day.date}`}>
                <span>
                  Day {day.day} · {day.date}
                </span>
                <h3>{day.title}</h3>
                <p>{day.guidance}</p>
              </article>
            ))}
          </div>
          <h2>Verify live travel options</h2>
          <div className="trip-planner__links">
            {result.links.map((link) => (
              <Link href={link.href} key={link.product}>
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
