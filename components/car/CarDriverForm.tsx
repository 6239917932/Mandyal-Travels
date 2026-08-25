'use client';
import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { SavedTravelerPicker } from '@/components/account/SavedTravelerPicker';
import { ageFromBirthDate, type SavedTravelerProfile } from '@/services/savedTravelerService';
export function CarDriverForm({
  nextQuery,
  pickupDate,
  rentalMode,
}: {
  nextQuery: Record<string, string>;
  pickupDate: string;
  rentalMode: 'self-drive' | 'chauffeur';
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
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
    if (rentalMode === 'self-drive') {
      const age = ageFromBirthDate(traveler.dateOfBirth, new Date(`${pickupDate}T00:00:00.000Z`));
      fill('age', age === null ? '' : String(age));
    }
    return changed;
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const firstName = String(form.get('firstName') ?? '').trim(),
      lastName = String(form.get('lastName') ?? '').trim(),
      email = String(form.get('email') ?? '').trim(),
      phone = String(form.get('phone') ?? '').replace(/\D/g, ''),
      license = String(form.get('license') ?? '').trim();
    const age = Number(form.get('age'));
    const next: Record<string, string> = {};
    if (firstName.length < 2) next.firstName = 'Enter a valid first name.';
    if (lastName.length < 2) next.lastName = 'Enter a valid last name.';
    if (rentalMode === 'self-drive') {
      if (!Number.isInteger(age) || age < 21 || age > 80)
        next.age = 'Driver must be between 21 and 80.';
      if (!/^[A-Z0-9][A-Z0-9 -]{4,38}[A-Z0-9]$/i.test(license))
        next.license = 'Enter a valid driving licence number.';
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Enter a valid email address.';
    if (phone.length < 10 || phone.length > 15) next.phone = 'Enter a valid phone number.';
    setErrors(next);
    if (Object.keys(next).length) return;
    sessionStorage.setItem(
      'mandyal-car-driver',
      JSON.stringify(
        rentalMode === 'self-drive'
          ? { driver: { firstName, lastName, age, license, email, phone } }
          : { traveller: { firstName, lastName, email, phone } },
      ),
    );
    router.push(`/cars/booking/payment?${new URLSearchParams(nextQuery)}`);
  }
  return (
    <form className="flight-passenger-form" noValidate onSubmit={submit} ref={formRef}>
      <fieldset>
        <legend>{rentalMode === 'self-drive' ? 'Primary driver' : 'Lead traveller'}</legend>
        <SavedTravelerPicker
          onApply={applyTraveler}
          targetLabel={rentalMode === 'self-drive' ? 'the primary driver' : 'the lead traveler'}
        />
        <Input error={errors.firstName} label="First name" name="firstName" />
        <Input error={errors.lastName} label="Last name" name="lastName" />
        {rentalMode === 'self-drive' ? (
          <>
            <Input
              error={errors.age}
              label="Driver age"
              min="21"
              max="80"
              name="age"
              type="number"
            />
            <Input error={errors.license} label="Driving licence number" name="license" />
          </>
        ) : null}
      </fieldset>
      <fieldset>
        <legend>Booking contact</legend>
        <Input error={errors.email} label="Email address" name="email" type="email" />
        <Input error={errors.phone} label="Phone number" name="phone" type="tel" />
      </fieldset>
      <p className="flight-passenger-form__notice">
        {rentalMode === 'self-drive'
          ? 'The driver must present the original licence and government-issued identification at pickup.'
          : 'The lead traveller must present government-issued identification. Chauffeur assignment is confirmed by the provider.'}
      </p>
      <button className="ui-button ui-button--accent ui-button--full-width" type="submit">
        Continue to payment
      </button>
    </form>
  );
}
