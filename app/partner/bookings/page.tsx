'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import type { ApiErrorResponse, PartnerBookingRecord } from '@/types/commerce';

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default function PartnerBookingsPage() {
  const [partnerKey, setPartnerKey] = useState('');
  const [bookings, setBookings] = useState<PartnerBookingRecord[]>([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const filteredBookings = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return bookings;
    return bookings.filter((booking) =>
      [booking.confirmationCode, booking.guestName, booking.guestEmail, booking.hotelName]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [bookings, filter]);

  const confirmedCount = bookings.filter((booking) => booking.status === 'confirmed').length;
  const paidValue = bookings
    .filter((booking) => booking.paymentStatus === 'captured')
    .reduce((total, booking) => total + booking.totalAmount, 0);

  async function loadBookings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/partner/bookings', {
        headers: { 'x-partner-key': partnerKey },
      });
      const result = (await response.json()) as { data: PartnerBookingRecord[] } | ApiErrorResponse;
      if (!response.ok || !('data' in result)) {
        setError(
          response.status === 401
            ? 'The partner access key is incorrect.'
            : 'Bookings could not be loaded.',
        );
        return;
      }
      setBookings(result.data);
    } catch {
      setError('The partner service could not be reached.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="booking-page partner-bookings">
      <div className="booking-page__container">
        <div className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Partner operations</p>
            <h1>Booking dashboard</h1>
            <p className="booking-page__intro">
              Monitor hotel reservations, payment state, stay dates, and room allocation.
            </p>
          </div>
          <Link className="ui-button ui-button--secondary" href="/partner/amendments">
            Amendment queue
          </Link>
        </div>
        <Card>
          <form className="booking-page__guest-form" onSubmit={loadBookings}>
            <Input
              label="Partner access key"
              name="partnerKey"
              onChange={(event) => setPartnerKey(event.target.value)}
              required
              type="password"
              value={partnerKey}
            />
            <Button fullWidth isLoading={isLoading} type="submit" variant="accent">
              Open booking dashboard
            </Button>
            {error ? (
              <p className="booking-page__payment-error" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        </Card>
        {bookings.length > 0 ? (
          <>
            <div className="partner-bookings__summary">
              <Card>
                <span>Total bookings</span>
                <strong>{bookings.length}</strong>
              </Card>
              <Card>
                <span>Confirmed</span>
                <strong>{confirmedCount}</strong>
              </Card>
              <Card>
                <span>Captured value</span>
                <strong>{money(paidValue, 'INR')}</strong>
              </Card>
            </div>
            <Card className="partner-bookings__search">
              <Input
                label="Search bookings"
                name="filter"
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Reference, guest, email, or hotel"
                value={filter}
              />
            </Card>
            <div className="partner-bookings__list" aria-live="polite">
              {filteredBookings.map((booking) => (
                <Card className="partner-bookings__booking" key={booking.confirmationCode}>
                  <div className="booking-confirmation__reference">
                    <span>{booking.hotelName}</span>
                    <strong>{booking.confirmationCode}</strong>
                  </div>
                  <div className="booking-confirmation__details">
                    <div>
                      <span>Guest</span>
                      <strong>{booking.guestName}</strong>
                      <small>{booking.guestEmail}</small>
                    </div>
                    <div>
                      <span>Stay</span>
                      <strong>
                        {booking.checkInDate} - {booking.checkOutDate}
                      </strong>
                    </div>
                    <div>
                      <span>Room</span>
                      <strong>
                        {booking.rooms} × {booking.roomName}
                      </strong>
                      <small>{booking.ratePlanName}</small>
                    </div>
                    <div>
                      <span>Booking</span>
                      <strong className={`partner-status partner-status--${booking.status}`}>
                        {booking.status}
                      </strong>
                    </div>
                    <div>
                      <span>Payment</span>
                      <strong>{booking.paymentStatus}</strong>
                    </div>
                    <div>
                      <span>Total</span>
                      <strong>{money(booking.totalAmount, booking.currency)}</strong>
                    </div>
                  </div>
                </Card>
              ))}
              {filteredBookings.length === 0 ? <p>No bookings match your search.</p> : null}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
