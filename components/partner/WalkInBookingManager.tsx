'use client';

import { type FormEvent, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import type {
  ApiErrorResponse,
  HotelBookingRecord,
  HotelQuote,
  PartnerDirectBookingOption,
} from '@/types/commerce';

type Props = Readonly<{ options: PartnerDirectBookingOption[] }>;

async function json<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function dateOffset(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function WalkInBookingManager({ options }: Props) {
  const [hotelSlug, setHotelSlug] = useState(options[0]?.hotelSlug ?? '');
  const property = options.find((candidate) => candidate.hotelSlug === hotelSlug);
  const [roomTypeId, setRoomTypeId] = useState(property?.rooms[0]?.roomTypeId ?? '');
  const room = property?.rooms.find((candidate) => candidate.roomTypeId === roomTypeId);
  const [ratePlanId, setRatePlanId] = useState(room?.ratePlans[0]?.ratePlanId ?? '');
  const [quote, setQuote] = useState<HotelQuote | null>(null);
  const [booking, setBooking] = useState<HotelBookingRecord | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const idempotencyKey = useRef(`partner-direct-${crypto.randomUUID()}`);
  const today = useMemo(() => dateOffset(0), []);
  const tomorrow = useMemo(() => dateOffset(1), []);

  function invalidateReview() {
    setQuote(null);
    setBooking(null);
    setError('');
  }

  function selectProperty(value: string) {
    const selected = options.find((candidate) => candidate.hotelSlug === value);
    const nextRoom = selected?.rooms[0];
    setHotelSlug(value);
    setRoomTypeId(nextRoom?.roomTypeId ?? '');
    setRatePlanId(nextRoom?.ratePlans[0]?.ratePlanId ?? '');
    invalidateReview();
  }

  function selectRoom(value: string) {
    const selected = property?.rooms.find((candidate) => candidate.roomTypeId === value);
    setRoomTypeId(value);
    setRatePlanId(selected?.ratePlans[0]?.ratePlanId ?? '');
    invalidateReview();
  }

  async function reviewStay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    setBooking(null);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch('/api/v1/partner/direct-bookings/quotes', {
        body: JSON.stringify({
          ...values,
          adults: Number(values.adults),
          children: Number(values.children),
          rooms: Number(values.rooms),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = await json<{ data: HotelQuote } | ApiErrorResponse>(response);
      if (!response.ok || !result || !('data' in result)) {
        setError(
          result && 'error' in result ? result.error.message : 'The stay could not be reviewed.',
        );
        return;
      }
      idempotencyKey.current = `partner-direct-${crypto.randomUUID()}`;
      setQuote(result.data);
    } catch {
      setError('The partner service could not be reached.');
    } finally {
      setPending(false);
    }
  }

  async function confirmBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quote) return;
    setPending(true);
    setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch('/api/v1/partner/direct-bookings', {
        body: JSON.stringify({
          availabilityLockId: quote.availabilityLock.id,
          guest: {
            email: values.email,
            firstName: values.firstName,
            lastName: values.lastName,
            phone: values.phone,
            specialRequests: values.specialRequests,
          },
          hotelSlug: quote.hotelSlug,
          quoteId: quote.id,
        }),
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey.current,
        },
        method: 'POST',
      });
      const result = await json<{ data: HotelBookingRecord } | ApiErrorResponse>(response);
      if (!response.ok || !result || !('data' in result)) {
        setError(
          result && 'error' in result ? result.error.message : 'The reservation was not created.',
        );
        return;
      }
      setBooking(result.data);
    } catch {
      setError('The partner service could not be reached.');
    } finally {
      setPending(false);
    }
  }

  if (!options.length) {
    return (
      <section className="ui-card ui-card--padded">
        <h2>Add rooms before taking a direct booking</h2>
        <p>This workspace needs an active managed property, room type and rate plan.</p>
        <Link className="ui-button ui-button--primary" href="/partner/properties">
          Open property settings
        </Link>
      </section>
    );
  }

  return (
    <div className="supplier-admin__stack">
      <form className="supplier-form ui-card ui-card--padded" onSubmit={reviewStay}>
        <div className="supplier-form__section-heading">
          <div>
            <h2>1. Review stay and availability</h2>
            <p>The quoted room is held for 10 minutes while guest details are confirmed.</p>
          </div>
        </div>
        <div className="supplier-form__grid">
          <label className="ui-field">
            <span className="ui-field__label">Property</span>
            <select
              className="ui-input"
              name="hotelSlug"
              onChange={(event) => selectProperty(event.target.value)}
              value={hotelSlug}
            >
              {options.map((option) => (
                <option key={option.id} value={option.hotelSlug}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Room type</span>
            <select
              className="ui-input"
              name="roomTypeId"
              onChange={(event) => selectRoom(event.target.value)}
              value={roomTypeId}
            >
              {property?.rooms.map((option) => (
                <option key={option.id} value={option.roomTypeId}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Rate plan</span>
            <select
              className="ui-input"
              name="ratePlanId"
              onChange={(event) => {
                setRatePlanId(event.target.value);
                invalidateReview();
              }}
              value={ratePlanId}
            >
              {room?.ratePlans.map((option) => (
                <option key={option.id} value={option.ratePlanId}>
                  {option.name} · ₹{option.nightlyRate.toLocaleString('en-IN')} + ₹
                  {option.taxesAndFees.toLocaleString('en-IN')}
                </option>
              ))}
            </select>
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Check-in</span>
            <input
              className="ui-input"
              defaultValue={today}
              min={today}
              name="checkInDate"
              onChange={invalidateReview}
              required
              type="date"
            />
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Check-out</span>
            <input
              className="ui-input"
              defaultValue={tomorrow}
              min={tomorrow}
              name="checkOutDate"
              onChange={invalidateReview}
              required
              type="date"
            />
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Rooms</span>
            <input
              className="ui-input"
              defaultValue="1"
              max="20"
              min="1"
              name="rooms"
              onChange={invalidateReview}
              required
              type="number"
            />
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Adults</span>
            <input
              className="ui-input"
              defaultValue="1"
              max="100"
              min="1"
              name="adults"
              onChange={invalidateReview}
              required
              type="number"
            />
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Children</span>
            <input
              className="ui-input"
              defaultValue="0"
              max="100"
              min="0"
              name="children"
              onChange={invalidateReview}
              required
              type="number"
            />
          </label>
        </div>
        <button className="ui-button ui-button--primary" disabled={pending} type="submit">
          {pending ? 'Checking…' : 'Review price and hold room'}
        </button>
      </form>

      {quote && !booking ? (
        <form className="supplier-form ui-card ui-card--padded" onSubmit={confirmBooking}>
          <div className="supplier-form__section-heading">
            <div>
              <h2>2. Guest and payment arrangement</h2>
              <p>
                Server-validated total:{' '}
                <strong>₹{quote.totalAmount.toLocaleString('en-IN')}</strong> for {quote.rooms} room
                {quote.rooms === 1 ? '' : 's'} and {quote.nights} night
                {quote.nights === 1 ? '' : 's'}.
              </p>
            </div>
          </div>
          <div className="supplier-form__grid">
            <label className="ui-field">
              <span className="ui-field__label">First name</span>
              <input className="ui-input" name="firstName" required />
            </label>
            <label className="ui-field">
              <span className="ui-field__label">Last name</span>
              <input className="ui-input" name="lastName" required />
            </label>
            <label className="ui-field">
              <span className="ui-field__label">Email</span>
              <input className="ui-input" name="email" required type="email" />
            </label>
            <label className="ui-field">
              <span className="ui-field__label">Phone</span>
              <input className="ui-input" minLength={7} name="phone" required type="tel" />
            </label>
          </div>
          <label className="ui-field">
            <span className="ui-field__label">Special requests or desk note</span>
            <textarea
              className="ui-input supplier-form__textarea"
              maxLength={1000}
              name="specialRequests"
            />
          </label>
          <div className="notice-banner">
            <strong>Payment due at property</strong>
            <p>
              No online payment is captured and no supplier payout is created. The booking will show
              a pending payment balance of ₹{quote.totalAmount.toLocaleString('en-IN')}.
            </p>
          </div>
          <label className="supplier-form__checkbox">
            <input name="confirmed" required type="checkbox" />I confirmed the dates, rate, guest
            details and pay-at-property arrangement with the guest.
          </label>
          <button className="ui-button ui-button--primary" disabled={pending} type="submit">
            {pending ? 'Creating reservation…' : 'Create direct reservation'}
          </button>
        </form>
      ) : null}

      {booking ? (
        <section className="ui-card ui-card--padded" role="status">
          <p className="hotel-page__eyebrow">Reservation created</p>
          <h2>{booking.confirmationCode}</h2>
          <p>
            {booking.guest.firstName} {booking.guest.lastName} · {booking.checkInDate} to{' '}
            {booking.checkOutDate}
          </p>
          <p>
            <strong>₹{booking.totalAmount.toLocaleString('en-IN')} due at property</strong>
          </p>
          <Link className="ui-button ui-button--primary" href="/partner/bookings">
            Open front desk
          </Link>
        </section>
      ) : null}
      {error ? (
        <p className="form-status form-status--error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
