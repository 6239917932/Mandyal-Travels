'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useBookingContext } from '@/context/BookingContext';
import type { ApiErrorResponse, HotelBookingRecord } from '@/types/commerce';

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default function PaymentPage() {
  const router = useRouter();
  const { booking, confirmBooking } = useBookingContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string>();

  if (!booking || !booking.guest) {
    return (
      <div className="booking-page">
        <div className="booking-page__container">
          <Card className="booking-page__empty-state">
            <p className="hotel-page__eyebrow">Booking details required</p>
            <h1>Complete the earlier booking steps first.</h1>
            <p>Select a room and add the lead guest before continuing to payment.</p>
            <Link className="booking-page__back-link" href="/hotels">
              Browse hotels
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const bookingDraft = booking;
  const bookingSlug = bookingDraft.hotel.slug;

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentError(undefined);
    setIsProcessing(true);

    const response = await fetch('/api/v1/hotels/bookings', {
      body: JSON.stringify({
        availabilityLockId: bookingDraft.availabilityLock.id,
        guest: bookingDraft.guest,
        hotelSlug: bookingDraft.hotel.slug,
        quoteId: bookingDraft.quoteId,
      }),
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': `hotel-booking-${bookingDraft.quoteId}`,
      },
      method: 'POST',
    });

    if (!response.ok) {
      const result = (await response.json()) as ApiErrorResponse;
      setPaymentError(result.error.message);
      setIsProcessing(false);
      return;
    }

    const { data: createdBooking } = (await response.json()) as { data: HotelBookingRecord };
    confirmBooking(createdBooking.confirmationCode, createdBooking.id);
    router.push(`/hotels/${bookingSlug}/booking/confirmation`);
  }

  return (
    <div className="booking-page">
      <div className="booking-page__container">
        <p className="hotel-page__eyebrow">Secure payment</p>
        <h1>Complete your booking</h1>
        <p className="booking-page__intro">
          Review the final total and use the demonstration payment form below.
        </p>

        <div className="booking-page__grid">
          <Card className="booking-page__payment-card">
            <div className="booking-page__secure-banner">
              <strong>Protected payment</strong>
              <span>This prototype does not store or submit card details.</span>
            </div>

            <form className="booking-page__guest-form" onSubmit={submitPayment}>
              <Input autoComplete="cc-name" label="Name on card" name="cardholderName" required />
              <Input
                autoComplete="cc-number"
                inputMode="numeric"
                label="Card number"
                maxLength={19}
                name="cardNumber"
                pattern="[0-9 ]{15,19}"
                placeholder="4242 4242 4242 4242"
                required
              />
              <div className="booking-page__payment-fields">
                <Input
                  autoComplete="cc-exp"
                  label="Expiry"
                  name="expiry"
                  pattern="(0[1-9]|1[0-2])/[0-9]{2}"
                  placeholder="MM/YY"
                  required
                />
                <Input
                  autoComplete="cc-csc"
                  inputMode="numeric"
                  label="CVV"
                  maxLength={4}
                  name="cvv"
                  pattern="[0-9]{3,4}"
                  placeholder="123"
                  required
                  type="password"
                />
              </div>
              <Button fullWidth isLoading={isProcessing} type="submit" variant="accent">
                Pay {formatCurrency(booking.pricing.total.amount, booking.pricing.total.currency)}
              </Button>
              {paymentError ? (
                <p className="booking-page__payment-error" role="alert">
                  {paymentError}
                </p>
              ) : null}
            </form>
          </Card>

          <Card className="booking-page__price-card">
            <p className="booking-page__location">Final booking summary</p>
            <h2>{booking.hotel.name}</h2>
            <p>{booking.selectedRoom.name}</p>
            <dl>
              <div>
                <dt>Lead guest</dt>
                <dd>
                  {booking.guest.firstName} {booking.guest.lastName}
                </dd>
              </div>
              <div>
                <dt>Stay</dt>
                <dd>
                  {booking.checkInDate} - {booking.checkOutDate}
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
          </Card>
        </div>
      </div>
    </div>
  );
}
