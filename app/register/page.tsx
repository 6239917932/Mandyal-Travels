import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AuthForm } from '@/components/auth/AuthForm';
import { getSafeReturnTo } from '@/lib/auth/redirect';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Create account' };

type RegisterPageProps = { searchParams: Promise<{ account?: string; returnTo?: string }> };

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const resolvedSearchParams = await searchParams;
  const returnTo = getSafeReturnTo(resolvedSearchParams.returnTo);
  if (await getCurrentUser()) redirect(returnTo ?? '/account');
  const accountType = resolvedSearchParams.account === 'business' ? 'business' : 'customer';

  return (
    <section className="auth-page">
      <div className="auth-page__intro">
        <p className="hotel-page__eyebrow">
          {accountType === 'business' ? 'Mandyal Travels for Business' : 'Join Mandyal Travels'}
        </p>
        <h1>
          {accountType === 'business' ? 'Create your business account.' : 'Create your account.'}
        </h1>
        <p>
          {accountType === 'business'
            ? 'Set up your organization and its first secure administrator account.'
            : 'Keep your contact details and future trips together in one secure place.'}
        </p>
      </div>
      <AuthForm accountType={accountType} mode="register" returnTo={returnTo ?? undefined} />
    </section>
  );
}
