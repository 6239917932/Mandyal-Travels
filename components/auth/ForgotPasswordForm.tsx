'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';

export function ForgotPasswordForm() {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError('');
    setMessage('');
    setIsSubmitting(true);
    const form = new FormData(formElement);

    try {
      const response = await fetch('/api/v1/auth/password-reset/request', {
        body: JSON.stringify({ email: form.get('email') }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result =
        (await readJsonResponse<{ data?: { message?: string }; error?: string }>(response)) ?? {};
      if (!response.ok) {
        setError(result.error ?? 'The reset request could not be completed. Please try again.');
        return;
      }
      setMessage(
        result.data?.message ??
          'If an account uses that email address, a password reset link will be sent shortly.',
      );
      formElement.reset();
    } catch {
      setError('The account service could not be reached. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form ui-card ui-card--padded" onSubmit={submit}>
      <label className="ui-field">
        <span className="ui-field__label">Email address</span>
        <input
          autoComplete="email"
          className="ui-input"
          maxLength={254}
          name="email"
          required
          type="email"
        />
      </label>
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
      <button className="ui-button ui-button--accent ui-button--full-width" disabled={isSubmitting}>
        {isSubmitting ? 'Please wait…' : 'Send reset link'}
      </button>
      <p className="auth-form__alternate">
        <Link href="/login">Back to sign in</Link>
      </p>
    </form>
  );
}
