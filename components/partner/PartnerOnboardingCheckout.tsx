'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse } from '@/types/commerce';

type CheckoutResponse = {
  data: {
    checkoutUrl: string | null;
    currency: string;
    discountAmount: number;
    dueNowAmount: number;
    orderId: string;
    status: string;
  };
};

export function PartnerOnboardingCheckout() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/v1/partners/onboarding/checkout', {
        body: JSON.stringify({
          couponCode: form.get('couponCode'),
          idempotencyKey: crypto.randomUUID(),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = await readJsonResponse<CheckoutResponse | ApiErrorResponse>(response);
      if (!response.ok || !result || !('data' in result)) {
        setError(
          result && 'error' in result
            ? result.error.message
            : 'The supplier checkout could not be created.',
        );
        return;
      }
      if (result.data.checkoutUrl) {
        window.location.assign(result.data.checkoutUrl);
        return;
      }
      router.refresh();
    } catch {
      setError('The supplier checkout service could not be reached.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="auth-form ui-card ui-card--padded" onSubmit={submit}>
      <p className="hotel-page__eyebrow">Step 1 of 3 · enrollment</p>
      <h2>Activate your supplier workspace</h2>
      <dl className="booking-summary__totals">
        <div>
          <dt>One-time setup</dt>
          <dd>₹25,000</dd>
        </div>
        <div>
          <dt>First monthly subscription</dt>
          <dd>₹999</dd>
        </div>
        <div>
          <dt>Due now</dt>
          <dd>₹25,999</dd>
        </div>
      </dl>
      <Input
        autoComplete="off"
        label="Launch coupon (optional)"
        maxLength={40}
        name="couponCode"
        placeholder="Enter coupon code"
      />
      <small>
        A valid full-waiver coupon reduces the amount due to ₹0. It does not bypass phone OTP,
        agreement acceptance, identity checks, or Mandyal Travels review.
      </small>
      {error ? (
        <p className="booking-page__payment-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button fullWidth isLoading={saving} type="submit" variant="accent">
        Continue to secure payment
      </Button>
    </form>
  );
}
