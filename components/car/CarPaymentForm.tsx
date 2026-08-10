'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';

interface AppliedPromotion {
  code: string;
  discountAmount: number;
  finalTotal: number;
  ruleVersion: number;
}

interface PromotionResponse {
  data?: AppliedPromotion;
  error?: { message?: string };
}

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
  const [promoCode, setPromoCode] = useState('');
  const [promotion, setPromotion] = useState<AppliedPromotion>();
  const [validatingPromotion, setValidatingPromotion] = useState(false);
  const subtotal = Number(bookingSummary.total);

  const money = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      currency: 'INR',
      maximumFractionDigits: 0,
      style: 'currency',
    }).format(amount);

  async function applyPromotion() {
    setValidatingPromotion(true);
    setPromotion(undefined);
    setErrors((current) => {
      const remaining = { ...current };
      delete remaining.promotion;
      return remaining;
    });

    try {
      const response = await fetch('/api/v1/promotions/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode, productType: 'CAR', subtotal }),
      });
      const payload = (await response.json()) as PromotionResponse;

      if (!response.ok || !payload.data) {
        setErrors((current) => ({
          ...current,
          promotion: payload.error?.message ?? 'The promotion could not be validated.',
        }));
        return;
      }

      setPromoCode(payload.data.code);
      setPromotion(payload.data);
    } catch {
      setErrors((current) => ({
        ...current,
        promotion: 'The promotion service is temporarily unavailable.',
      }));
    } finally {
      setValidatingPromotion(false);
    }
  }

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
    const finalTotal = promotion?.finalTotal ?? subtotal;
    const completedBooking = {
      ...bookingSummary,
      subtotal,
      discountAmount: promotion?.discountAmount ?? 0,
      promotionCode: promotion?.code,
      promotionRuleVersion: promotion?.ruleVersion,
      total: finalTotal,
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
          totalAmount: finalTotal,
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
      <div className="flight-payment-form__row">
        <Input
          autoComplete="off"
          error={errors.promotion}
          label="Promotion code"
          name="promoCode"
          onChange={(event) => {
            setPromoCode(event.target.value.toUpperCase());
            setPromotion(undefined);
          }}
          placeholder="ROADTRIP"
          value={promoCode}
        />
        <div className="ui-field">
          <span className="ui-field__label">Offer validation</span>
          <button
            className="ui-button ui-button--secondary"
            disabled={validatingPromotion || promoCode.trim().length === 0}
            onClick={applyPromotion}
            type="button"
          >
            {validatingPromotion ? 'Checking…' : 'Apply code'}
          </button>
        </div>
      </div>
      {promotion ? (
        <p className="flight-booking-page__revalidation" role="status">
          {promotion.code} applied: save {money(promotion.discountAmount)} and pay{' '}
          {money(promotion.finalTotal)}.
        </p>
      ) : null}
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
