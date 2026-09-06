'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';
import type { LoginAudience } from '@/lib/auth/loginAudience';

type AuthFormProps = {
  accountType?: 'agent' | 'business' | 'customer';
  loginAudience?: LoginAudience;
  message?: string;
  mode: 'login' | 'register';
  returnTo?: string;
};

export function AuthForm({
  accountType = 'customer',
  loginAudience,
  message,
  mode,
  returnTo,
}: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [emailOtpRequired, setEmailOtpRequired] = useState(false);
  const [emailOtpChallengeId, setEmailOtpChallengeId] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');

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
          loginAudience,
          accountType,
          marketingConsent: form.get('marketingConsent') === 'on',
          organizationName: form.get('organizationName'),
          password: form.get('password'),
          mfaCode: form.get('mfaCode'),
          emailOtpCode: form.get('emailOtpCode'),
          emailOtpChallengeId,
          returnTo,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result =
        (await readJsonResponse<{
          emailOtpChallengeId?: string;
          emailOtpRequired?: boolean;
          error?: string;
          message?: string;
          mfaRequired?: boolean;
          redirectTo?: string;
        }>(response)) ?? {};

      if (result.emailOtpRequired && result.emailOtpChallengeId) {
        const newlyIssued = result.emailOtpChallengeId !== emailOtpChallengeId;
        setEmailOtpRequired(true);
        setEmailOtpChallengeId(result.emailOtpChallengeId);
        if (newlyIssued) {
          setVerificationMessage(result.message ?? result.error ?? 'Enter the code sent by email.');
        }
        setError(newlyIssued ? '' : (result.error ?? 'The verification code was not accepted.'));
        return;
      }

      if (!response.ok) {
        setMfaRequired(Boolean(result.mfaRequired));
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
  const isPartnerRegistration = isRegister && returnTo?.startsWith('/partners/apply');
  const alternateHref = isPartnerRegistration
    ? `/login?portal=partner&returnTo=${encodeURIComponent('/partners/apply')}`
    : isRegister && accountType === 'business'
      ? '/login?portal=corporate'
      : isRegister && accountType === 'agent'
        ? '/login?portal=partner'
        : isRegister
          ? '/login?portal=customer'
          : loginAudience === 'partner'
            ? `/register?returnTo=${encodeURIComponent('/partners/apply')}`
            : loginAudience === 'corporate'
              ? '/register?account=business'
              : '/register';

  return (
    <form className="auth-form ui-card ui-card--padded" onSubmit={handleSubmit}>
      {message ? (
        <p className="business-policy__success" role="status">
          {message}
        </p>
      ) : null}
      {verificationMessage ? (
        <p className="business-policy__success" role="status">
          {verificationMessage}
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

      {isRegister && ['agent', 'business'].includes(accountType) ? (
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

      {!isRegister && mfaRequired ? (
        <label className="ui-field">
          <span className="ui-field__label">Authenticator or recovery code</span>
          <input
            autoComplete="one-time-code"
            className="ui-input"
            maxLength={20}
            name="mfaCode"
            required
          />
        </label>
      ) : null}
      {emailOtpRequired ? (
        <label className="ui-field">
          <span className="ui-field__label">Email verification code</span>
          <input
            autoComplete="one-time-code"
            className="ui-input"
            inputMode="numeric"
            maxLength={6}
            name="emailOtpCode"
            pattern="[0-9]{6}"
            required
          />
          <small>Enter the six-digit code. It expires after 10 minutes.</small>
        </label>
      ) : null}
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
        {isRegister ? (
          <small>Use at least 10 characters and avoid commonly used passwords.</small>
        ) : null}
      </label>

      {!isRegister ? (
        <p className="auth-form__alternate">
          <Link href="/forgot-password">Forgot your password?</Link>
        </p>
      ) : null}

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
          : emailOtpRequired
            ? isRegister
              ? 'Verify code and finish registration'
              : 'Verify code and sign in'
            : isRegister && accountType === 'agent'
              ? 'Create travel agency account'
              : isRegister && accountType === 'business'
                ? 'Create business account'
                : isRegister
                  ? 'Create account'
                  : 'Sign in'}
      </button>

      {!isRegister && loginAudience === 'admin' ? (
        <p className="auth-form__alternate">
          Administrator access is restricted to the separately configured platform administrator.
        </p>
      ) : (
        <p className="auth-form__alternate">
          {isRegister
            ? 'Already have an account?'
            : loginAudience === 'partner'
              ? 'New hotel or car partner?'
              : loginAudience === 'corporate'
                ? 'Setting up company travel?'
                : 'New to Mandyal Travels?'}{' '}
          <Link href={alternateHref}>
            {isRegister
              ? 'Sign in'
              : loginAudience === 'partner'
                ? 'Create a partner application'
                : loginAudience === 'corporate'
                  ? 'Create a corporate account'
                  : 'Create a customer account'}
          </Link>
        </p>
      )}
    </form>
  );
}
