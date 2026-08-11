'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';

type AccountProfileFormProps = {
  email: string;
  firstName: string;
  lastName: string;
};

export function AccountProfileForm({ email, firstName, lastName }: AccountProfileFormProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);
    const data = new FormData(event.currentTarget);

    try {
      const response = await fetch('/api/v1/account/profile', {
        body: JSON.stringify({
          firstName: data.get('firstName'),
          lastName: data.get('lastName'),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = (await readJsonResponse<{ error?: string }>(response)) ?? {};
      if (!response.ok) {
        setError(result.error ?? 'The profile could not be updated.');
        return;
      }

      setMessage('Profile updated successfully.');
      router.refresh();
    } catch {
      setError('The account service could not be reached. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="account-trips" aria-labelledby="profile-settings-heading">
      <div className="account-trips__heading">
        <p className="hotel-page__eyebrow">Personal details</p>
        <h2 id="profile-settings-heading">Profile settings</h2>
      </div>
      <Card>
        <form className="auth-form" onSubmit={updateProfile}>
          <div className="auth-form__row">
            <Input
              autoComplete="given-name"
              defaultValue={firstName}
              label="First name"
              maxLength={80}
              name="firstName"
              required
            />
            <Input
              autoComplete="family-name"
              defaultValue={lastName}
              label="Last name"
              maxLength={80}
              name="lastName"
              required
            />
          </div>
          <Input disabled label="Email address" value={email} />
          <small>
            The sign-in email stays locked until verified email-change delivery is connected.
          </small>
          <Button isLoading={isSubmitting} type="submit" variant="secondary">
            Save profile
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
    </section>
  );
}
