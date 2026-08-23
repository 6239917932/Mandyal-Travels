import type { Metadata } from 'next';

import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return (
    <section className="auth-page">
      <div className="auth-page__intro">
        <p className="hotel-page__eyebrow">Account recovery</p>
        <h1>Reset your password.</h1>
        <p>Enter your account email. Reset links expire after 30 minutes and work only once.</p>
      </div>
      <ForgotPasswordForm />
    </section>
  );
}
