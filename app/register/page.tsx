import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AuthForm } from '@/components/auth/AuthForm';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Create account' };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect('/account');

  return (
    <section className="auth-page">
      <div className="auth-page__intro">
        <p className="hotel-page__eyebrow">Join Mandyal Travels</p>
        <h1>Create your account.</h1>
        <p>Keep your contact details and future trips together in one secure place.</p>
      </div>
      <AuthForm mode="register" />
    </section>
  );
}
