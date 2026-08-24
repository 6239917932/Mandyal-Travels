'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { Input } from '@/components/ui/Input';
import { SavedTravelerPicker } from '@/components/account/SavedTravelerPicker';
import {
  ageFromBirthDate,
  bookingGenderValue,
  type SavedTravelerProfile,
} from '@/services/savedTravelerService';

interface BusPassengerFormProps {
  nextQuery: Record<string, string>;
  passengers: number;
  travelDate: string;
}

type FormErrors = Record<string, string>;

export function BusPassengerForm({ nextQuery, passengers, travelDate }: BusPassengerFormProps) {
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
    const age = ageFromBirthDate(traveler.dateOfBirth, new Date(`${travelDate}T00:00:00.000Z`));
    fill(`age-${index}`, age === null ? '' : String(age));
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

    for (let index = 0; index < passengers; index += 1) {
      const firstName = String(form.get(`firstName-${index}`) ?? '').trim();
      const lastName = String(form.get(`lastName-${index}`) ?? '').trim();
      const age = Number(form.get(`age-${index}`));
      const gender = String(form.get(`gender-${index}`) ?? '');
      if (firstName.length < 2) nextErrors[`firstName-${index}`] = 'Enter a valid first name.';
      if (lastName.length < 2) nextErrors[`lastName-${index}`] = 'Enter a valid last name.';
      if (!Number.isInteger(age) || age < 1 || age > 120)
        nextErrors[`age-${index}`] = 'Enter an age between 1 and 120.';
      if (!gender) nextErrors[`gender-${index}`] = 'Select a gender.';
    }

    const email = String(form.get('email') ?? '').trim();
    const phone = String(form.get('phone') ?? '').replace(/\D/g, '');
    if (!/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = 'Enter a valid email address.';
    if (phone.length < 10 || phone.length > 15) nextErrors.phone = 'Enter a valid phone number.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const travelers = Array.from({ length: passengers }, (_, index) => ({
      age: Number(form.get(`age-${index}`)),
      firstName: String(form.get(`firstName-${index}`)).trim(),
      gender: String(form.get(`gender-${index}`)),
      lastName: String(form.get(`lastName-${index}`)).trim(),
    }));
    sessionStorage.setItem(
      'mandyal-bus-passengers',
      JSON.stringify({ contact: { email, phone }, travelers }),
    );
    router.push(`/buses/booking/payment?${new URLSearchParams(nextQuery).toString()}`);
  }

  return (
    <form className="flight-passenger-form" noValidate onSubmit={submit} ref={formRef}>
      {Array.from({ length: passengers }, (_, index) => (
        <fieldset className="flight-passenger-form__traveler" key={index}>
          <legend>Passenger {index + 1}</legend>
          <SavedTravelerPicker
            onApply={(traveler) => applyTraveler(index, traveler)}
            targetLabel={`passenger ${index + 1}`}
          />
          <Input
            error={errors[`firstName-${index}`]}
            label="First name"
            name={`firstName-${index}`}
          />
          <Input error={errors[`lastName-${index}`]} label="Last name" name={`lastName-${index}`} />
          <Input
            error={errors[`age-${index}`]}
            label="Age"
            min="1"
            max="120"
            name={`age-${index}`}
            type="number"
          />
          <div className="ui-field">
            <label className="ui-field__label" htmlFor={`gender-${index}`}>
              Gender
            </label>
            <select
              className="ui-input"
              defaultValue=""
              id={`gender-${index}`}
              name={`gender-${index}`}
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
        <Input error={errors.email} label="Email address" name="email" type="email" />
        <Input error={errors.phone} label="Phone number" name="phone" type="tel" />
      </fieldset>
      <p className="flight-passenger-form__notice">
        Passenger details should match the identification carried during travel.
      </p>
      <button className="ui-button ui-button--accent ui-button--full-width" type="submit">
        Continue to payment
      </button>
    </form>
  );
}
