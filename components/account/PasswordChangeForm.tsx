'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';

export function PasswordChangeForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    const data = new FormData(event.currentTarget);

    try {
      const response = await fetch('/api/v1/account/password', {
        body: JSON.stringify({
          confirmPassword: data.get('confirmPassword'),
          currentPassword: data.get('currentPassword'),
          newPassword: data.get('newPassword'),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = (await readJsonResponse<{ error?: string }>(response)) ?? {};
      if (!response.ok) {
        setError(result.error ?? 'The password could not be updated.');
        return;
      }

      router.push('/login?passwordChanged=1');
      router.refresh();
    } catch {
      setError('The account service could not be reached. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="account-trips" aria-labelledby="password-change-heading">
      <div className="account-trips__heading">
        <p className="hotel-page__eyebrow">Account security</p>
        <h2 id="password-change-heading">Change password</h2>
        <p>Changing your password signs out every device connected to this account.</p>
      </div>
      <Card>
        <form className="auth-form" onSubmit={changePassword}>
          <Input
            autoComplete="current-password"
            label="Current password"
            maxLength={128}
            minLength={10}
            name="currentPassword"
            required
            type="password"
          />
          <div className="auth-form__row">
            <Input
              autoComplete="new-password"
              label="New password"
              maxLength={128}
              minLength={10}
              name="newPassword"
              required
              type="password"
            />
            <Input
              autoComplete="new-password"
              label="Confirm new password"
              maxLength={128}
              minLength={10}
              name="confirmPassword"
              required
              type="password"
            />
          </div>
          <small>Use between 10 and 128 characters and avoid commonly used passwords.</small>
          <Button isLoading={isSubmitting} type="submit" variant="secondary">
            Update password
          </Button>
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
