'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';

type BusinessOrganizationProfileProps = {
  contactEmail: string;
  contactPhone: string;
  name: string;
};

export function BusinessOrganizationProfile({
  contactEmail,
  contactPhone,
  name,
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
          contactEmail: data.get('contactEmail'),
          contactPhone: data.get('contactPhone'),
          name: data.get('name'),
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
        <p className="booking-confirmation__note">
          These details identify the organization on company booking statements and account
          servicing records. Statutory tax details are not collected here.
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
