'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { useBookingContext } from '@/context/BookingContext';

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default function BookingConfirmationPage() {
  const { booking, clearBooking } = useBookingContext();

  if (!booking || booking.status !== 'confirmed' || !booking.confirmationCode || !booking.guest) {
    return (
      <div className="booking-page">
        <div className="booking-page__container">
          <Card className="booking-page__empty-state">
            <p className="hotel-page__eyebrow">No confirmed booking</p>
            <h1>Your confirmation will appear here.</h1>
            <p>Complete the hotel booking flow to receive a Mandyal Travels reference.</p>
            <Link className="booking-page__back-link" href="/hotels">
              Browse hotels
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page booking-confirmation">
      <div className="booking-page__container">
        <div className="booking-confirmation__mark" aria-hidden="true">
          ✓
        </div>
        <p className="hotel-page__eyebrow">Booking confirmed</p>
        <h1>You&apos;re all set.</h1>
        <p className="booking-page__intro">
          A confirmation summary has been prepared for {booking.guest.email}.
        </p>
        <Card className="booking-confirmation__card">
          <div className="booking-confirmation__reference">
            <span>Mandyal Travels booking reference</span>
            <strong>{booking.confirmationCode}</strong>
          </div>
          <div className="booking-confirmation__details">
            <div>
              <span>Hotel</span>
              <strong>{booking.hotel.name}</strong>
            </div>
            <div>
              <span>Room</span>
              <strong>{booking.selectedRoom.name}</strong>
            </div>
            <div>
              <span>Check-in</span>
              <strong>{booking.checkInDate}</strong>
            </div>
            <div>
              <span>Check-out</span>
              <strong>{booking.checkOutDate}</strong>
            </div>
            <div>
              <span>Guest</span>
              <strong>
                {booking.guest.firstName} {booking.guest.lastName}
              </strong>
            </div>
            <div>
              <span>Amount paid</span>
              <strong>
                {formatCurrency(booking.pricing.total.amount, booking.pricing.total.currency)}
              </strong>
            </div>
            <div>
              <span>Payment status</span>
              <strong>{booking.paymentStatus === 'captured' ? 'Captured' : 'Pending'}</strong>
            </div>
          </div>
          <p className="booking-confirmation__note">
            Your reservation and voucher are saved in the booking system. Payment capture and email
            delivery remain simulated until approved provider integrations are configured.
          </p>
          <Link className="ui-button ui-button--primary" href="/hotels" onClick={clearBooking}>
            Plan another stay
          </Link>
        </Card>
      </div>
    </div>
  );
}
