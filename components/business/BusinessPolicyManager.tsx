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

type BusinessPolicyVersion = BusinessPolicy & {
  createdAt: string;
  createdByName: string | null;
  version: number;
};

type BusinessPolicyManagerProps = {
  initialHistory: BusinessPolicyVersion[];
  initialPolicy: BusinessPolicy;
};

function formatMaximumAmount(amount: number | null) {
  if (amount === null) return 'No spending limit';
  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export function BusinessPolicyManager({
  initialHistory,
  initialPolicy,
}: BusinessPolicyManagerProps) {
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
      let result: { data?: { version?: number }; error?: string } = {};

      if (responseText) {
        try {
          result = JSON.parse(responseText) as { data?: { version?: number }; error?: string };
        } catch {
          result = {};
        }
      }

      if (!response.ok) {
        setError(result.error ?? 'The travel policy could not be saved.');
        return;
      }

      setMessage(
        result.data?.version
          ? `Travel policy version ${result.data.version} saved successfully.`
          : 'Travel policy saved successfully.',
      );
      router.refresh();
    } catch {
      setError('The travel policy service could not be reached. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
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
              <small>Company travel requests are sent to an administrator for review.</small>
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

      <Card>
        <div className="business-policy-history__heading">
          <strong>Policy version history</strong>
          <span>Latest {initialHistory.length} versions</span>
        </div>
        {initialHistory.length === 0 ? (
          <p className="booking-confirmation__note">
            The current policy will appear here after the database migration is applied.
          </p>
        ) : (
          <ol className="business-policy-history">
            {initialHistory.map((version) => (
              <li key={version.version}>
                <div>
                  <strong>Version {version.version}</strong>
                  <span>
                    {version.approvalRequired ? 'Approval required' : 'Automatic approval'} /{' '}
                    {version.defaultCabinClass.replaceAll('_', ' ').toLowerCase()} /{' '}
                    {formatMaximumAmount(version.maximumTripAmount)}
                  </span>
                </div>
                <div>
                  <time dateTime={version.createdAt}>
                    {new Date(version.createdAt).toLocaleString('en-IN')}
                  </time>
                  <span>{version.createdByName ?? 'System migration'}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </>
  );
}
