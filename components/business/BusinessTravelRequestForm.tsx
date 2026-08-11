'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';

type BusinessTravelRequestFormProps = {
  organizationName: string;
  policy: {
    approvalRequired: boolean;
    defaultCabinClass: string;
    maximumTripAmount: number | null;
  };
};

export function BusinessTravelRequestForm({
  organizationName,
  policy,
}: BusinessTravelRequestFormProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/v1/business/travel-requests', {
        body: JSON.stringify({
          endDate: data.get('endDate') || null,
          estimatedAmount: Number(data.get('estimatedAmount')),
          productType: data.get('productType'),
          startDate: data.get('startDate'),
          title: data.get('title'),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result =
        (await readJsonResponse<{ data?: { status?: string }; error?: string }>(response)) ?? {};

      if (!response.ok) {
        setError(result.error ?? 'The company travel request could not be created.');
        return;
      }

      form.reset();
      setMessage(
        result.data?.status === 'PENDING'
          ? 'Request sent to the business administrator for approval.'
          : 'Request approved automatically under the saved travel policy.',
      );
      router.refresh();
    } catch {
      setError('The company travel service could not be reached. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <form className="business-travel-request" onSubmit={submitRequest}>
        <div>
          <strong>Request travel for {organizationName}</strong>
          <p className="booking-confirmation__note">
            This creates an approval request only. No booking or payment is made at this stage.
          </p>
        </div>

        <div className="auth-form__row">
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="business-product-type">
              Travel product
            </label>
            <select className="ui-input" id="business-product-type" name="productType" required>
              <option value="FLIGHT">Flight</option>
              <option value="HOTEL">Hotel</option>
              <option value="BUS">Bus</option>
              <option value="CAR">Car</option>
            </select>
          </div>
          <Input
            label="Trip purpose or destination"
            maxLength={160}
            name="title"
            placeholder="Client meeting in Mumbai"
            required
          />
        </div>

        <div className="auth-form__row">
          <Input label="Start date" name="startDate" required type="date" />
          <Input label="End date (optional)" name="endDate" type="date" />
        </div>

        <Input
          label="Estimated amount (INR)"
          max="10000000"
          min="1"
          name="estimatedAmount"
          required
          step="1"
          type="number"
        />

        <p className="booking-confirmation__note">
          Policy:{' '}
          {policy.approvalRequired ? 'administrator approval required' : 'automatic approval'}
          {policy.maximumTripAmount !== null
            ? `, review threshold INR ${policy.maximumTripAmount.toLocaleString('en-IN')}`
            : ', no amount threshold'}
          . Default flight cabin: {policy.defaultCabinClass.replaceAll('_', ' ').toLowerCase()}.
        </p>

        <Button isLoading={isSubmitting} type="submit" variant="primary">
          Submit company travel request
        </Button>
        {message ? (
          <p className="business-policy__success" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="auth-form__error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </Card>
  );
}
