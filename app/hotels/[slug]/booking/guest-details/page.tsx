'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useBookingContext } from '@/context/BookingContext';
import type { BookingGuest } from '@/types/booking';

const emptyGuest: BookingGuest = {
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
};

export default function GuestDetailsPage() {
  const router = useRouter();
  const { booking, updateGuest } = useBookingContext();

  if (!booking) {
    return (
      <div className="booking-page">
        <div className="booking-page__container">
          <Card className="booking-page__empty-state">
            <p className="hotel-page__eyebrow">No room selected</p>
            <h1>Start by selecting a room.</h1>
            <p>We need a selected room before collecting traveller details.</p>
            <Link className="booking-page__back-link" href="/hotels">
              Browse hotels
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const bookingSlug = booking.hotel.slug;

  function saveGuestDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    updateGuest({
      email: String(formData.get('email') ?? '').trim(),
      firstName: String(formData.get('firstName') ?? '').trim(),
      lastName: String(formData.get('lastName') ?? '').trim(),
      phone: String(formData.get('phone') ?? '').trim(),
    });
    router.push(`/hotels/${bookingSlug}/booking/payment`);
  }

  const guest = booking.guest ?? emptyGuest;

  return (
    <div className="booking-page">
      <div className="booking-page__container">
        <p className="hotel-page__eyebrow">Guest details</p>
        <h1>Who is staying?</h1>
        <p className="booking-page__intro">
          Enter the lead guest&apos;s contact details. We&apos;ll use these for your booking
          confirmation.
        </p>

        <div className="booking-page__grid">
          <Card>
            <h2>{booking.hotel.name}</h2>
            <p className="booking-page__stay-summary">
              {booking.selectedRoom.name} · {booking.checkInDate} to {booking.checkOutDate}
            </p>
          </Card>

          <Card className="booking-page__guest-form-card">
            <form className="booking-page__guest-form" onSubmit={saveGuestDetails}>
              <Input defaultValue={guest.firstName} label="First name" name="firstName" required />
              <Input defaultValue={guest.lastName} label="Last name" name="lastName" required />
              <Input
                defaultValue={guest.email}
                label="Email address"
                name="email"
                required
                type="email"
              />
              <Input
                defaultValue={guest.phone}
                label="Phone number"
                name="phone"
                required
                type="tel"
              />

              <Button fullWidth type="submit" variant="accent">
                Continue to secure payment
              </Button>
            </form>
            <p className="booking-page__form-note">
              Your contact details are used only for this booking and its service updates.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
