'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse } from '@/types/commerce';

export function PartnerApplicationForm({
  defaultEmail,
  defaultName,
}: {
  defaultEmail: string;
  defaultName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/v1/partners/applications', {
        body: JSON.stringify(Object.fromEntries(form)),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = await readJsonResponse<{ data: { id: string } } | ApiErrorResponse>(response);
      if (!response.ok || !result || !('data' in result)) {
        setError(
          result && 'error' in result
            ? result.error.message
            : 'The request could not be submitted.',
        );
        return;
      }
      router.refresh();
    } catch {
      setError('The partner onboarding service could not be reached.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="auth-form ui-card ui-card--padded" onSubmit={submit}>
      <div className="auth-form__row">
        <Input label="Business name" maxLength={120} name="businessName" required />
        <label className="ui-field">
          <span className="ui-field__label">Supplier channel</span>
          <select className="ui-input" name="partnerType" required>
            <option value="HOTEL">Hotel owner or property manager</option>
            <option value="CAR">Car owner or fleet operator</option>
            <option value="BUS">Bus operator</option>
          </select>
        </label>
      </div>
      <div className="auth-form__row">
        <Input
          defaultValue={defaultName}
          label="Primary contact"
          maxLength={120}
          name="contactName"
          required
        />
        <Input
          defaultValue={defaultEmail}
          label="Business email"
          maxLength={200}
          name="contactEmail"
          required
          type="email"
        />
      </div>
      <div className="auth-form__row">
        <Input label="Phone number" maxLength={30} name="contactPhone" required type="tel" />
        <Input label="Operating city" maxLength={100} name="city" required />
      </div>
      <label className="ui-field">
        <span className="ui-field__label">Inventory summary</span>
        <textarea
          className="ui-input partner-application__textarea"
          maxLength={600}
          minLength={20}
          name="inventorySummary"
          placeholder="Example: 28-room hotel in Jaipur, or 12 self-drive cars operating from Delhi."
          required
        />
      </label>
      <p className="business-policy__note">
        Submitting this form does not grant supplier access. Mandyal Travels verifies and activates
        every supplier account.
      </p>
      {error ? (
        <p className="booking-page__payment-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button fullWidth isLoading={saving} type="submit" variant="accent">
        Submit for verification
      </Button>
    </form>
  );
}
