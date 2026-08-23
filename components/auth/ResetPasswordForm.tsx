'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useRef, useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';

export function ResetPasswordForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tokenRef = useRef('');

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    tokenRef.current = fragment.get('token') ?? '';
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!tokenRef.current) {
      setError('This password reset link is incomplete. Request a new link.');
      return;
    }
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch('/api/v1/auth/password-reset/confirm', {
        body: JSON.stringify({
          confirmPassword: form.get('confirmPassword'),
          newPassword: form.get('newPassword'),
          token: tokenRef.current,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = (await readJsonResponse<{ error?: string }>(response)) ?? {};
      if (!response.ok) {
        setError(result.error ?? 'The password could not be reset. Request a new link.');
        return;
      }
      router.replace('/login?passwordReset=1');
      router.refresh();
    } catch {
      setError('The account service could not be reached. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form ui-card ui-card--padded" onSubmit={submit}>
      <label className="ui-field">
        <span className="ui-field__label">New password</span>
        <input
          autoComplete="new-password"
          className="ui-input"
          maxLength={128}
          minLength={10}
          name="newPassword"
          required
          type="password"
        />
        <small>Use between 10 and 128 characters.</small>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Confirm new password</span>
        <input
          autoComplete="new-password"
          className="ui-input"
          maxLength={128}
          minLength={10}
          name="confirmPassword"
          required
          type="password"
        />
      </label>
      {error ? (
        <p className="auth-form__error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="ui-button ui-button--accent ui-button--full-width" disabled={isSubmitting}>
        {isSubmitting ? 'Resetting…' : 'Reset password'}
      </button>
      <p className="auth-form__alternate">
        <Link href="/forgot-password">Request a new reset link</Link>
      </p>
    </form>
  );
}
