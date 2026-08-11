'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { Input } from '@/components/ui/Input';
import { BusinessCheckoutNotice } from '@/components/business/BusinessCheckoutNotice';
import {
  clearActiveBusinessTravelRequest,
  readActiveBusinessTravelRequest,
} from '@/lib/businessTravelClient';

interface BusPaymentFormProps {
  bookingSummary: Record<string, string | number>;
  nextQuery: Record<string, string>;
}

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

export function BusPaymentForm({ bookingSummary, nextQuery }: BusPaymentFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paid, setPaid] = useState(false);
  const [processing, setProcessing] = useState(false);
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
        body: JSON.stringify({
          code: promoCode,
          productType: 'BUS',
          subtotal,
        }),
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

    const businessRequest = readActiveBusinessTravelRequest();
    if (businessRequest && businessRequest.productType !== 'BUS') {
      setErrors({ payment: 'The active company approval is for a different travel product.' });
      return;
    }

    setProcessing(true);
    const confirmationCode = `MB${Date.now().toString().slice(-8)}`;
    const finalTotal = promotion?.finalTotal ?? subtotal;
    const completedBooking = {
      ...bookingSummary,
      subtotal,
      discountAmount: promotion?.discountAmount ?? 0,
      promotionCode: promotion?.code,
      promotionRuleVersion: promotion?.ruleVersion,
      total: finalTotal,
      confirmationCode,
      passengerDraft: parsedPassengerDraft,
      paymentStatus: 'captured',
      documentQuery: new URLSearchParams(nextQuery).toString(),
    };
    try {
      const response = await fetch('/api/v1/account/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessSelection: nextQuery,
          businessTravelRequestId: businessRequest?.id,
          productType: 'BUS',
          promotionCode: promotion?.code,
          confirmationCode,
          status: 'CONFIRMED',
          title: `${bookingSummary.origin} → ${bookingSummary.destination}`,
          subtitle: bookingSummary.operatorName,
          startDate: bookingSummary.travelDate,
          totalAmount: finalTotal,
          details: completedBooking,
        }),
      });
      if (businessRequest && !response.ok) {
        const result = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        setErrors({
          payment:
            result.error?.message ??
            'The company approval could not be verified. No payment has been captured.',
        });
        setProcessing(false);
        return;
      }
    } catch {
      if (businessRequest) {
        setErrors({
          payment: 'The company approval service is unavailable. No payment has been captured.',
        });
        setProcessing(false);
        return;
      }
    }
    sessionStorage.setItem('mandyal-bus-booking', JSON.stringify(completedBooking));
    if (businessRequest) clearActiveBusinessTravelRequest();
    setPaid(true);
    setProcessing(false);
    const query = new URLSearchParams({ ...nextQuery, confirmationCode });
    router.push(`/buses/booking/confirmation?${query.toString()}`);
  }

  return (
    <form className="flight-payment-form" noValidate onSubmit={submit}>
      <BusinessCheckoutNotice productType="BUS" />
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
        disabled={paid || processing}
        type="submit"
      >
        {paid ? 'Payment captured' : processing ? 'Checking approval...' : 'Pay securely'}
      </button>
      {errors.payment ? (
        <p className="ui-field__error" role="alert">
          {errors.payment}
        </p>
      ) : null}
    </form>
  );
}
