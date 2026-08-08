'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { Input } from '@/components/ui/Input';

interface BusPaymentFormProps {
  bookingSummary: Record<string, string | number>;
  nextQuery: Record<string, string>;
}

export function BusPaymentForm({ bookingSummary, nextQuery }: BusPaymentFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paid, setPaid] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const cardholder = String(form.get('cardholder') ?? '').trim();
    const cardNumber = String(form.get('cardNumber') ?? '').replace(/\D/g, '');
    const expiry = String(form.get('expiry') ?? '').trim();
    const cvv = String(form.get('cvv') ?? '').replace(/\D/g, '');
    const nextErrors: Record<string, string> = {};
    if (cardholder.length < 3) nextErrors.cardholder = 'Enter the cardholder name.';
    if (cardNumber.length < 12 || cardNumber.length > 19)
      nextErrors.cardNumber = 'Enter 12 to 19 demonstration digits.';
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) nextErrors.expiry = 'Use MM/YY format.';
    if (cvv.length < 3 || cvv.length > 4) nextErrors.cvv = 'Enter 3 or 4 digits.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const passengerDraft = sessionStorage.getItem('mandyal-bus-passengers');
    if (!passengerDraft) {
      setErrors({ payment: 'Passenger details are missing. Please return and enter them again.' });
      return;
    }

    let parsedPassengerDraft: unknown;
    try {
      parsedPassengerDraft = JSON.parse(passengerDraft);
    } catch {
      setErrors({ payment: 'Passenger details are invalid. Please return and enter them again.' });
      return;
    }

    setPaid(true);
    const confirmationCode = `MB${Date.now().toString().slice(-8)}`;
    sessionStorage.setItem(
      'mandyal-bus-booking',
      JSON.stringify({
        ...bookingSummary,
        confirmationCode,
        passengerDraft: parsedPassengerDraft,
        paymentStatus: 'captured',
      }),
    );
    const query = new URLSearchParams({ ...nextQuery, confirmationCode });
    router.push(`/buses/booking/confirmation?${query.toString()}`);
  }

  return (
    <form className="flight-payment-form" noValidate onSubmit={submit}>
      <div className="flight-payment-form__protected">
        <strong>Protected demonstration payment</strong>
        <span>Do not enter a real card number. These fields are never stored or submitted.</span>
      </div>
      <Input error={errors.cardholder} label="Name on card" name="cardholder" />
      <Input
        error={errors.cardNumber}
        inputMode="numeric"
        label="Card number"
        name="cardNumber"
        placeholder="4242 4242 4242 4242"
      />
      <div className="flight-payment-form__row">
        <Input error={errors.expiry} label="Expiry" name="expiry" placeholder="MM/YY" />
        <Input error={errors.cvv} inputMode="numeric" label="CVV" name="cvv" type="password" />
      </div>
      <button
        className="ui-button ui-button--accent ui-button--full-width"
        disabled={paid}
        type="submit"
      >
        {paid ? 'Payment captured' : 'Pay securely'}
      </button>
      {errors.payment ? (
        <p className="ui-field__error" role="alert">
          {errors.payment}
        </p>
      ) : null}
    </form>
  );
}
