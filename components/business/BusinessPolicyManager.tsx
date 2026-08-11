'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

type BusinessPolicy = {
  approvalRequired: boolean;
  defaultCabinClass: string;
  maximumTripAmount: number | null;
};

type BusinessPolicyManagerProps = { initialPolicy: BusinessPolicy };

export function BusinessPolicyManager({ initialPolicy }: BusinessPolicyManagerProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function savePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const maximumTripAmount = data.get('maximumTripAmount')?.toString().trim() ?? '';
    setError('');
    setMessage('');
    setIsSaving(true);

    try {
      const response = await fetch('/api/v1/business/policy', {
        body: JSON.stringify({
          approvalRequired: data.get('approvalRequired') === 'on',
          defaultCabinClass: data.get('defaultCabinClass'),
          maximumTripAmount: maximumTripAmount ? Number(maximumTripAmount) : null,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const responseText = await response.text();
      let result: { error?: string } = {};

      if (responseText) {
        try {
          result = JSON.parse(responseText) as { error?: string };
        } catch {
          result = {};
        }
      }

      if (!response.ok) {
        setError(result.error ?? 'The travel policy could not be saved.');
        return;
      }

      setMessage('Travel policy saved successfully.');
      router.refresh();
    } catch {
      setError('The travel policy service could not be reached. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <form className="business-policy" onSubmit={savePolicy}>
        <label className="auth-form__checkbox">
          <input
            defaultChecked={initialPolicy.approvalRequired}
            name="approvalRequired"
            type="checkbox"
          />
          <span>
            <strong>Require booking approval</strong>
            <small>Managed travellers must receive administrator approval before booking.</small>
          </span>
        </label>

        <div className="auth-form__row">
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="defaultCabinClass">
              Default flight cabin
            </label>
            <select
              className="ui-input"
              defaultValue={initialPolicy.defaultCabinClass}
              id="defaultCabinClass"
              name="defaultCabinClass"
            >
              <option value="ECONOMY">Economy</option>
              <option value="PREMIUM_ECONOMY">Premium economy</option>
              <option value="BUSINESS">Business</option>
              <option value="FIRST">First class</option>
            </select>
          </div>
          <Input
            defaultValue={initialPolicy.maximumTripAmount ?? ''}
            label="Maximum trip amount (INR)"
            min="1000"
            name="maximumTripAmount"
            placeholder="No limit"
            step="1000"
            type="number"
          />
        </div>

        <p className="booking-confirmation__note">
          Leave the maximum amount blank when the organization does not require a spending limit.
        </p>
        <Button isLoading={isSaving} type="submit" variant="primary">
          Save travel policy
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
