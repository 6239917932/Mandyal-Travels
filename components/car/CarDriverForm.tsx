'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
export function CarDriverForm({ nextQuery }: { nextQuery: Record<string, string> }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
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
    if (!Number.isInteger(age) || age < 21 || age > 80)
      next.age = 'Driver must be between 21 and 80.';
    if (license.length < 6) next.license = 'Enter a valid driving licence number.';
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Enter a valid email address.';
    if (phone.length < 10 || phone.length > 15) next.phone = 'Enter a valid phone number.';
    setErrors(next);
    if (Object.keys(next).length) return;
    sessionStorage.setItem(
      'mandyal-car-driver',
      JSON.stringify({ firstName, lastName, age, license, email, phone }),
    );
    router.push(`/cars/booking/payment?${new URLSearchParams(nextQuery)}`);
  }
  return (
    <form className="flight-passenger-form" noValidate onSubmit={submit}>
      <fieldset>
        <legend>Primary driver</legend>
        <Input error={errors.firstName} label="First name" name="firstName" />
        <Input error={errors.lastName} label="Last name" name="lastName" />
        <Input error={errors.age} label="Driver age" min="21" max="80" name="age" type="number" />
        <Input error={errors.license} label="Driving licence number" name="license" />
      </fieldset>
      <fieldset>
        <legend>Booking contact</legend>
        <Input error={errors.email} label="Email address" name="email" type="email" />
        <Input error={errors.phone} label="Phone number" name="phone" type="tel" />
      </fieldset>
      <p className="flight-passenger-form__notice">
        The driver must present the original licence and government-issued identification at pickup.
      </p>
      <button className="ui-button ui-button--accent ui-button--full-width" type="submit">
        Continue to payment
      </button>
    </form>
  );
}
