'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';

type AuthFormProps = {
  accountType?: 'business' | 'customer';
  message?: string;
  mode: 'login' | 'register';
  returnTo?: string;
};

export function AuthForm({ accountType = 'customer', message, mode, returnTo }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch(`/api/v1/auth/${mode}`, {
        body: JSON.stringify({
          email: form.get('email'),
          firstName: form.get('firstName'),
          lastName: form.get('lastName'),
          accountType,
          marketingConsent: form.get('marketingConsent') === 'on',
          organizationName: form.get('organizationName'),
          password: form.get('password'),
          returnTo,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result =
        (await readJsonResponse<{ error?: string; redirectTo?: string }>(response)) ?? {};

      if (!response.ok) {
        setError(result.error ?? 'We could not complete your request. Please try again.');
        return;
      }

      router.push(result.redirectTo ?? '/account');
      router.refresh();
    } catch {
      setError('The account service could not be reached. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isRegister = mode === 'register';

  return (
    <form className="auth-form ui-card ui-card--padded" onSubmit={handleSubmit}>
      {message ? (
        <p className="business-policy__success" role="status">
          {message}
        </p>
      ) : null}
      {isRegister ? (
        <div className="auth-form__row">
          <label className="ui-field">
            <span className="ui-field__label">First name</span>
            <input
              autoComplete="given-name"
              className="ui-input"
              maxLength={80}
              name="firstName"
              required
            />
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Last name</span>
            <input
              autoComplete="family-name"
              className="ui-input"
              maxLength={80}
              name="lastName"
              required
            />
          </label>
        </div>
      ) : null}

      {isRegister && accountType === 'business' ? (
        <label className="ui-field">
          <span className="ui-field__label">Organization name</span>
          <input
            autoComplete="organization"
            className="ui-input"
            maxLength={120}
            minLength={2}
            name="organizationName"
            required
          />
        </label>
      ) : null}

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
      <label className="ui-field">
        <span className="ui-field__label">Password</span>
        <input
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          className="ui-input"
          maxLength={128}
          minLength={10}
          name="password"
          required
          type="password"
        />
        {isRegister ? <small>Use at least 10 characters.</small> : null}
      </label>

      {isRegister ? (
        <label className="auth-form__checkbox">
          <input name="marketingConsent" type="checkbox" />
          <span>Send me occasional Mandyal Travels offers (optional).</span>
        </label>
      ) : null}

      {error ? (
        <p className="auth-form__error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="ui-button ui-button--accent ui-button--full-width" disabled={isSubmitting}>
        {isSubmitting
          ? 'Please wait...'
          : isRegister && accountType === 'business'
            ? 'Create business account'
            : isRegister
              ? 'Create account'
              : 'Sign in'}
      </button>

      <p className="auth-form__alternate">
        {isRegister ? 'Already have an account?' : 'New to Mandyal Travels?'}{' '}
        <Link
          href={
            returnTo
              ? `${isRegister ? '/login' : '/register'}?returnTo=${encodeURIComponent(returnTo)}`
              : isRegister
                ? '/login'
                : '/register'
          }
        >
          {isRegister ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
    </form>
  );
}
