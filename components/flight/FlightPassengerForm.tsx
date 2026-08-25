'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { Input } from '@/components/ui/Input';
import { SavedTravelerPicker } from '@/components/account/SavedTravelerPicker';
import { bookingGenderValue, type SavedTravelerProfile } from '@/services/savedTravelerService';

interface FlightPassengerFormProps {
  adults: number;
  nextQuery: Record<string, string>;
}

type FormErrors = Record<string, string>;

export function FlightPassengerForm({ adults, nextQuery }: FlightPassengerFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  function applyTraveler(index: number, traveler: SavedTravelerProfile) {
    const form = formRef.current;
    if (!form) return 0;
    let changed = 0;
    const fill = (name: string, value: string) => {
      const field = form.elements.namedItem(name);
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) return;
      if (field.value.trim() || !value) return;
      field.value = value;
      changed += 1;
    };
    fill(`firstName-${index}`, traveler.firstName);
    fill(`lastName-${index}`, traveler.lastName);
    fill(`gender-${index}`, bookingGenderValue(traveler.gender));
    if (index === 0) {
      fill('email', traveler.email);
      fill('phone', traveler.phone);
    }
    return changed;
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextErrors: FormErrors = {};

    for (let index = 0; index < adults; index += 1) {
      const firstName = String(form.get(`firstName-${index}`) ?? '').trim();
      const lastName = String(form.get(`lastName-${index}`) ?? '').trim();
      const gender = String(form.get(`gender-${index}`) ?? '');
      if (firstName.length < 2) nextErrors[`firstName-${index}`] = 'Enter the first name as on ID.';
      if (lastName.length < 2) nextErrors[`lastName-${index}`] = 'Enter the last name as on ID.';
      if (!gender) nextErrors[`gender-${index}`] = 'Select a gender.';
    }

    const email = String(form.get('email') ?? '').trim();
    const phone = String(form.get('phone') ?? '').replace(/\D/g, '');
    if (!/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = 'Enter a valid email address.';
    if (phone.length < 10 || phone.length > 15) nextErrors.phone = 'Enter a valid phone number.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const passengers = Array.from({ length: adults }, (_, index) => ({
      firstName: String(form.get(`firstName-${index}`)).trim(),
      gender: String(form.get(`gender-${index}`)),
      lastName: String(form.get(`lastName-${index}`)).trim(),
    }));
    sessionStorage.setItem(
      'mandyal-flight-passengers',
      JSON.stringify({ contact: { email, phone }, passengers }),
    );
    router.push(`/flights/booking/payment?${new URLSearchParams(nextQuery).toString()}`);
  }

  return (
    <form className="flight-passenger-form" noValidate onSubmit={submit} ref={formRef}>
      {Array.from({ length: adults }, (_, index) => (
        <fieldset className="flight-passenger-form__traveler" key={index}>
          <legend>Adult {index + 1}</legend>
          <SavedTravelerPicker
            onApply={(traveler) => applyTraveler(index, traveler)}
            targetLabel={`adult ${index + 1}`}
          />
          <Input
            autoComplete="given-name"
            error={errors[`firstName-${index}`]}
            label="First name"
            name={`firstName-${index}`}
            placeholder="As shown on government ID"
          />
          <Input
            autoComplete="family-name"
            error={errors[`lastName-${index}`]}
            label="Last name"
            name={`lastName-${index}`}
            placeholder="As shown on government ID"
          />
          <div className="ui-field">
            <label className="ui-field__label" htmlFor={`gender-${index}`}>
              Gender
            </label>
            <select
              aria-invalid={Boolean(errors[`gender-${index}`])}
              className="ui-input"
              id={`gender-${index}`}
              name={`gender-${index}`}
              defaultValue=""
            >
              <option disabled value="">
                Select
              </option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
            {errors[`gender-${index}`] ? (
              <p className="ui-field__error">{errors[`gender-${index}`]}</p>
            ) : null}
          </div>
        </fieldset>
      ))}

      <fieldset className="flight-passenger-form__contact">
        <legend>Booking contact</legend>
        <Input
          autoComplete="email"
          error={errors.email}
          label="Email address"
          name="email"
          type="email"
        />
        <Input
          autoComplete="tel"
          error={errors.phone}
          label="Phone number"
          name="phone"
          type="tel"
        />
      </fieldset>

      <p className="flight-passenger-form__notice">
        Passenger names must match the government-issued identification used at the airport.
      </p>
      <button className="ui-button ui-button--accent ui-button--full-width" type="submit">
        Continue to payment
      </button>
    </form>
  );
}
