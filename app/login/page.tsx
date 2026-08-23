import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AuthForm } from '@/components/auth/AuthForm';
import { getAccountHomePath, getSafeReturnTo } from '@/lib/auth/redirect';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Sign in' };

type LoginPageProps = {
  searchParams: Promise<{
    passwordChanged?: string;
    passwordReset?: string;
    returnTo?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const values = await searchParams;
  const returnTo = getSafeReturnTo(values.returnTo);
  const user = await getCurrentUser();
  if (user) redirect(returnTo ?? getAccountHomePath(user.role));

  return (
    <section className="auth-page">
      <div className="auth-page__intro">
        <p className="hotel-page__eyebrow">Account access</p>
        <h1>Welcome back.</h1>
        <p>Sign in to manage your Mandyal Travels account securely.</p>
      </div>
      <AuthForm
        message={
          values.passwordReset === '1'
            ? 'Your password was reset. Sign in with your new password.'
            : values.passwordChanged === '1'
              ? 'Your password was updated. Sign in again on this device.'
              : undefined
        }
        mode="login"
        returnTo={returnTo ?? undefined}
      />
    </section>
  );
}
