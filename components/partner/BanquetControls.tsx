'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { HotelBanquetStatus } from '@/lib/pms/banquets';
import type { ApiErrorResponse } from '@/types/commerce';

const newRetryKey = () => crypto.randomUUID();

async function responseError(response: Response, fallback: string) {
  const result = await readJsonResponse<{ data: unknown } | ApiErrorResponse>(response);
  return !response.ok || !result || !('data' in result)
    ? result && 'error' in result
      ? result.error.message
      : fallback
    : undefined;
}

export function BanquetEventForm({
  businessDate,
  propertyId,
}: {
  businessDate: string;
  propertyId: string;
}) {
  const router = useRouter();
  const retryKey = useRef(newRetryKey());
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setIsSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch('/api/v1/partner/banquet-events', {
        body: JSON.stringify({
          contactEmail: form.get('contactEmail'),
          contactPhone: form.get('contactPhone'),
          endTime: form.get('endTime'),
          eventDate: form.get('eventDate'),
          eventName: form.get('eventName'),
          eventType: form.get('eventType'),
          expectedGuests: form.get('expectedGuests'),
          organizerName: form.get('organizerName'),
          propertyId,
          quoteAmount: form.get('quoteAmount'),
          requirements: form.get('requirements'),
          startTime: form.get('startTime'),
          venueName: form.get('venueName'),
        }),
        headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': retryKey.current },
        method: 'POST',
      });
      const message = await responseError(response, 'The event was not recorded.');
      if (message) {
        setError(message);
        return;
      }
      retryKey.current = newRetryKey();
      formElement.reset();
      router.refresh();
    } catch {
      setError('The event service could not be reached. You can safely retry.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="supplier-form__grid" onSubmit={submit}>
      <Input label="Event name" maxLength={120} minLength={2} name="eventName" required />
      <Input label="Organizer name" maxLength={120} minLength={2} name="organizerName" required />
      <label className="ui-field">
        <span className="ui-field__label">Event type</span>
        <select className="ui-input" name="eventType" required>
          <option value="WEDDING">Wedding</option>
          <option value="CONFERENCE">Conference</option>
          <option value="MEETING">Meeting</option>
          <option value="SOCIAL_EVENT">Social event</option>
        </select>
      </label>
      <Input
        label="Venue or function space"
        maxLength={120}
        minLength={2}
        name="venueName"
        required
      />
      <Input label="Event date" min={businessDate} name="eventDate" required type="date" />
      <Input
        label="Expected guests"
        max={10000}
        min={1}
        name="expectedGuests"
        required
        type="number"
      />
      <Input label="Start time" name="startTime" required type="time" />
      <Input label="End time" name="endTime" required type="time" />
      <Input
        label="Quoted amount (INR)"
        max={100000000}
        min={0}
        name="quoteAmount"
        required
        type="number"
      />
      <Input label="Contact email" maxLength={160} name="contactEmail" type="email" />
      <Input label="Contact phone" maxLength={32} name="contactPhone" type="tel" />
      <label className="ui-field supplier-form__full-width">
        <span className="ui-field__label">Requirements and quotation notes</span>
        <textarea className="ui-input" maxLength={1000} name="requirements" rows={4} />
      </label>
      <p className="supplier-form__full-width">
        Enter at least one contact method. New records begin as enquiries; no room inventory,
        payment, invoice, or accounting entry is created.
      </p>
      {error ? (
        <p className="booking-page__payment-error supplier-form__full-width" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="supplier-form__full-width" isLoading={isSaving} type="submit">
        Record banquet enquiry
      </Button>
    </form>
  );
}

export function BanquetTransitionControls({
  eventId,
  nextStatuses,
  version,
}: {
  eventId: string;
  nextStatuses: readonly HotelBanquetStatus[];
  version: number;
}) {
  const router = useRouter();
  const retryKey = useRef(newRetryKey());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  async function transition(targetStatus: HotelBanquetStatus) {
    setError(undefined);
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/v1/partner/banquet-events/${encodeURIComponent(eventId)}`,
        {
          body: JSON.stringify({ note, targetStatus, version }),
          headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': retryKey.current },
          method: 'POST',
        },
      );
      const message = await responseError(response, 'The event state was not updated.');
      if (message) {
        setError(message);
        return;
      }
      retryKey.current = newRetryKey();
      router.refresh();
    } catch {
      setError('The event service could not be reached. You can safely retry.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!nextStatuses.length) return null;
  return (
    <div className="supplier-form__grid">
      {nextStatuses.includes('CANCELLED') ? (
        <Input
          label="Event note / cancellation reason"
          maxLength={500}
          onChange={(event) => setNote(event.target.value)}
          value={note}
        />
      ) : null}
      {nextStatuses.map((status) => (
        <Button
          disabled={status === 'CANCELLED' && note.trim().length < 8}
          isLoading={isSaving}
          key={status}
          onClick={() => transition(status)}
          type="button"
          variant={status === 'CANCELLED' ? 'secondary' : 'primary'}
        >
          {status === 'PROVISIONAL'
            ? 'Place provisional venue hold'
            : status === 'CONFIRMED'
              ? 'Confirm event'
              : status === 'COMPLETED'
                ? 'Mark completed'
                : 'Cancel event'}
        </Button>
      ))}
      {error ? (
        <p className="booking-page__payment-error supplier-form__full-width" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
