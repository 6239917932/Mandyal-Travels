import type { Metadata } from 'next';

import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata: Metadata = { title: 'Reset password' };

export default function ResetPasswordPage() {
  return (
    <section className="auth-page">
      <div className="auth-page__intro">
        <p className="hotel-page__eyebrow">Account recovery</p>
        <h1>Choose a new password.</h1>
        <p>Completing this reset signs out every existing browser session for your protection.</p>
      </div>
      <ResetPasswordForm />
    </section>
  );
}
