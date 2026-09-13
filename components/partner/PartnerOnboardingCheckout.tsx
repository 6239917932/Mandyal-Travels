'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
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
    try {
      const response = await fetch('/api/v1/partners/onboarding/checkout', {
        body: JSON.stringify({
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
      <p className="hotel-page__eyebrow">Step 1 of 3 · protected enrollment</p>
      <h2>Activate the six-month PMS trial</h2>
      <dl className="booking-summary__totals">
        <div>
          <dt>Standard remote setup</dt>
          <dd>₹0</dd>
        </div>
        <div>
          <dt>Months 1–6</dt>
          <dd>Free</dd>
        </div>
        <div>
          <dt>Months 7–12 · up to 10 rooms</dt>
          <dd>₹999.50 + GST/month</dd>
        </div>
        <div>
          <dt>Month 13 onward · up to 10 rooms</dt>
          <dd>₹1,999 + GST/month</dd>
        </div>
      </dl>
      <small>
        Transaction fees apply from day one under the accepted fee schedule. The free trial does not
        bypass phone OTP, agreement acceptance, identity checks, or Mandyal Travels review.
      </small>
      {error ? (
        <p className="booking-page__payment-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button fullWidth isLoading={saving} type="submit" variant="accent">
        Activate free trial
      </Button>
    </form>
  );
}
