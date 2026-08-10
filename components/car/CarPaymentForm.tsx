'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
export function CarPaymentForm({
  bookingSummary,
  nextQuery,
}: {
  bookingSummary: Record<string, string | number>;
  nextQuery: Record<string, string>;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paid, setPaid] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget),
      name = String(form.get('cardholder') ?? '').trim(),
      number = String(form.get('cardNumber') ?? '').replace(/\D/g, ''),
      expiry = String(form.get('expiry') ?? ''),
      cvv = String(form.get('cvv') ?? '').replace(/\D/g, '');
    const next: Record<string, string> = {};
    if (name.length < 3) next.cardholder = 'Enter the cardholder name.';
    if (number.length < 12 || number.length > 19)
      next.cardNumber = 'Enter 12 to 19 demonstration digits.';
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) next.expiry = 'Use MM/YY format.';
    if (cvv.length < 3 || cvv.length > 4) next.cvv = 'Enter 3 or 4 digits.';
    const draft = sessionStorage.getItem('mandyal-car-driver');
    if (!draft) next.payment = 'Driver details are missing. Please return and enter them again.';
    setErrors(next);
    if (Object.keys(next).length) return;
    let driver: unknown;
    try {
      driver = JSON.parse(draft!);
    } catch {
      setErrors({ payment: 'Driver details are invalid. Please enter them again.' });
      return;
    }
    setPaid(true);
    const confirmationCode = `MC${Date.now().toString().slice(-8)}`;
    const completedBooking = {
      ...bookingSummary,
      confirmationCode,
      driver,
      paymentStatus: 'captured',
      documentQuery: new URLSearchParams(nextQuery).toString(),
    };
    sessionStorage.setItem(
      'mandyal-car-booking',
      JSON.stringify(completedBooking),
    );
    try {
      await fetch('/api/v1/account/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productType: 'CAR',
          confirmationCode,
          status: 'CONFIRMED',
          title: bookingSummary.vehicleName,
          subtitle: bookingSummary.providerName,
          startDate: bookingSummary.pickupDate,
          endDate: bookingSummary.dropoffDate,
          totalAmount: bookingSummary.total,
          details: completedBooking,
        }),
      });
    } catch {
      // Account trip history is optional and must not interrupt checkout.
    }
    router.push(
      `/cars/booking/confirmation?${new URLSearchParams({ ...nextQuery, confirmationCode })}`,
    );
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
      {errors.payment ? <p className="ui-field__error">{errors.payment}</p> : null}
    </form>
  );
}
