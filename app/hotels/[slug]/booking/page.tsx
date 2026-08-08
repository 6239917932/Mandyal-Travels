'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { useBookingContext } from '@/context/BookingContext';
import type { HotelBookingDraft } from '@/types/booking';

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default function HotelBookingPage() {
  const router = useRouter();
  const { booking, clearBooking } = useBookingContext();

  if (!booking) {
    return (
      <div className="booking-page">
        <div className="booking-page__container">
          <Card className="booking-page__empty-state">
            <p className="hotel-page__eyebrow">No room selected</p>
            <h1>Your booking details will appear here.</h1>
            <p>
              Select an available room first, then return here to review its price and stay dates.
            </p>
            <Link className="booking-page__back-link" href="/hotels">
              Browse hotels
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  function chooseDifferentRoom(currentBooking: HotelBookingDraft) {
    const hotelUrl = new URLSearchParams({
      checkInDate: currentBooking.checkInDate,
      checkOutDate: currentBooking.checkOutDate,
      rooms: currentBooking.rooms.toString(),
    });

    clearBooking();
    router.push(`/hotels/${currentBooking.hotel.slug}?${hotelUrl.toString()}`);
  }

  return (
    <div className="booking-page">
      <div className="booking-page__container">
        <p className="hotel-page__eyebrow">Booking review</p>
        <h1>Review your stay</h1>
        <p className="booking-page__intro">
          Check the room, dates, and price before we collect guest and payment details.
        </p>

        <div className="booking-page__grid">
          <Card className="booking-page__stay-card">
            <p className="booking-page__location">
              {booking.hotel.location.address.city}, {booking.hotel.location.address.country}
            </p>
            <h2>{booking.hotel.name}</h2>
            <h3>{booking.selectedRoom.name}</h3>
            <p>{booking.ratePlan.name}</p>

            <dl className="booking-page__facts">
              <div>
                <dt>Check-in</dt>
                <dd>{booking.checkInDate}</dd>
              </div>
              <div>
                <dt>Check-out</dt>
                <dd>{booking.checkOutDate}</dd>
              </div>
              <div>
                <dt>Rooms</dt>
                <dd>{booking.rooms}</dd>
              </div>
            </dl>
          </Card>

          <Card className="booking-page__price-card">
            <h2>Price summary</h2>
            <dl>
              <div>
                <dt>Room charges</dt>
                <dd>
                  {formatCurrency(
                    booking.pricing.roomCharges.amount,
                    booking.pricing.roomCharges.currency,
                  )}
                </dd>
              </div>
              <div>
                <dt>Taxes and fees</dt>
                <dd>
                  {formatCurrency(
                    booking.pricing.taxesAndFees.amount,
                    booking.pricing.taxesAndFees.currency,
                  )}
                </dd>
              </div>
              <div className="booking-page__total">
                <dt>Total</dt>
                <dd>
                  {formatCurrency(booking.pricing.total.amount, booking.pricing.total.currency)}
                </dd>
              </div>
            </dl>
            <p>{booking.ratePlan.cancellationPolicy.description}</p>
            <p className="booking-page__lock-note">
              Price and room held until{' '}
              {new Date(booking.quoteExpiresAt).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <Link
              className="ui-button ui-button--accent ui-button--full-width"
              href={`/hotels/${booking.hotel.slug}/booking/guest-details`}
            >
              Continue to guest details
            </Link>
            <button
              className="booking-page__change-button"
              onClick={() => chooseDifferentRoom(booking)}
              type="button"
            >
              Choose a different room
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
