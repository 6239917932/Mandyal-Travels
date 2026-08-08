'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { Input } from '@/components/ui/Input';

interface BusPassengerFormProps {
  nextQuery: Record<string, string>;
  passengers: number;
}

type FormErrors = Record<string, string>;

export function BusPassengerForm({ nextQuery, passengers }: BusPassengerFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<FormErrors>({});

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
    <form className="flight-passenger-form" noValidate onSubmit={submit}>
      {Array.from({ length: passengers }, (_, index) => (
        <fieldset className="flight-passenger-form__traveler" key={index}>
          <legend>Passenger {index + 1}</legend>
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
