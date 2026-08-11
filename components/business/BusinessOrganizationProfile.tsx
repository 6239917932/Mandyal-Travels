'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';

type BusinessOrganizationProfileProps = {
  billingAddress: string;
  contactEmail: string;
  contactPhone: string;
  legalName: string;
  name: string;
  taxRegistrationId: string;
};

export function BusinessOrganizationProfile({
  billingAddress,
  contactEmail,
  contactPhone,
  legalName,
  name,
  taxRegistrationId,
}: BusinessOrganizationProfileProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError('');
    setMessage('');
    setIsSaving(true);

    try {
      const response = await fetch('/api/v1/business/profile', {
        body: JSON.stringify({
          billingAddress: data.get('billingAddress'),
          contactEmail: data.get('contactEmail'),
          contactPhone: data.get('contactPhone'),
          legalName: data.get('legalName'),
          name: data.get('name'),
          taxRegistrationId: data.get('taxRegistrationId'),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = (await readJsonResponse<{ error?: string }>(response)) ?? {};
      if (!response.ok) {
        setError(result.error ?? 'The organization profile could not be saved.');
        return;
      }

      setMessage('Organization profile saved successfully.');
      router.refresh();
    } catch {
      setError('The organization profile service could not be reached. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <form className="business-policy" onSubmit={saveProfile}>
        <Input defaultValue={name} label="Organization name" maxLength={120} name="name" required />
        <Input
          defaultValue={legalName || name}
          label="Legal or registered name"
          maxLength={160}
          name="legalName"
          required
        />
        <div className="auth-form__row">
          <Input
            autoComplete="email"
            defaultValue={contactEmail}
            label="Primary contact email"
            name="contactEmail"
            required
            type="email"
          />
          <Input
            autoComplete="tel"
            defaultValue={contactPhone}
            label="Contact phone (optional)"
            maxLength={25}
            name="contactPhone"
            placeholder="+91 98765 43210"
            type="tel"
          />
        </div>
        <div className="ui-field">
          <label className="ui-field__label" htmlFor="organization-billing-address">
            Billing address
          </label>
          <textarea
            className="ui-input business-approval__note"
            defaultValue={billingAddress}
            id="organization-billing-address"
            maxLength={500}
            name="billingAddress"
            required
            rows={4}
          />
        </div>
        <Input
          autoCapitalize="characters"
          defaultValue={taxRegistrationId}
          label="GST registration number (optional)"
          maxLength={15}
          name="taxRegistrationId"
          placeholder="22AAAAA0000A1Z5"
        />
        <p className="booking-confirmation__note">
          These details identify the organization on company booking statements and account
          servicing records. Recording a GST number does not convert a reporting statement into a
          statutory tax invoice.
        </p>
        <Button isLoading={isSaving} type="submit" variant="primary">
          Save organization profile
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
