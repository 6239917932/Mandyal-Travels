'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useBookingContext } from '@/context/BookingContext';
import type { BookingGuest } from '@/types/booking';
import { SavedTravelerPicker } from '@/components/account/SavedTravelerPicker';
import type { SavedTravelerProfile } from '@/services/savedTravelerService';

const emptyGuest: BookingGuest = {
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  specialRequests: '',
};

export default function GuestDetailsPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const { booking, updateGuest } = useBookingContext();

  function applyTraveler(traveler: SavedTravelerProfile) {
    const form = formRef.current;
    if (!form) return 0;
    let changed = 0;
    const fill = (name: string, value: string) => {
      const field = form.elements.namedItem(name);
      if (!(field instanceof HTMLInputElement)) return;
      if (field.value.trim() || !value) return;
      field.value = value;
      changed += 1;
    };
    fill('firstName', traveler.firstName);
    fill('lastName', traveler.lastName);
    fill('email', traveler.email);
    fill('phone', traveler.phone);
    return changed;
  }

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
      specialRequests: String(formData.get('specialRequests') ?? '').trim(),
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
            <form className="booking-page__guest-form" onSubmit={saveGuestDetails} ref={formRef}>
              <SavedTravelerPicker onApply={applyTraveler} targetLabel="the lead guest" />
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
              <label className="ui-field">
                <span className="ui-field__label">Special requests (optional)</span>
                <textarea
                  className="ui-input supplier-form__textarea"
                  defaultValue={guest.specialRequests}
                  maxLength={1000}
                  name="specialRequests"
                  placeholder="Accessibility support, dietary needs, arrival details, or room preferences"
                />
                <small>Requests are shared with the property but cannot be guaranteed.</small>
              </label>

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
