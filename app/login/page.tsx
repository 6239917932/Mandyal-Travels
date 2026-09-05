import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AuthForm } from '@/components/auth/AuthForm';
import { Card } from '@/components/ui/Card';
import { getAccountHomePath, getSafeReturnTo } from '@/lib/auth/redirect';
import {
  inferLoginAudience,
  normalizeLoginAudience,
  type LoginAudience,
} from '@/lib/auth/loginAudience';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Sign in' };

type LoginPageProps = {
  searchParams: Promise<{
    passwordChanged?: string;
    passwordReset?: string;
    portal?: string;
    returnTo?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const values = await searchParams;
  const returnTo = getSafeReturnTo(values.returnTo);
  const audience =
    normalizeLoginAudience(values.portal) ??
    inferLoginAudience(returnTo) ??
    (values.passwordReset === '1' || values.passwordChanged === '1' ? 'customer' : null);
  const user = await getCurrentUser();
  if (user) redirect(returnTo ?? getAccountHomePath(user.role));

  if (!audience) {
    const portals: Array<{
      audience: LoginAudience;
      description: string;
      href: string;
      title: string;
    }> = [
      {
        audience: 'customer',
        description: 'For travellers booking personal hotels, cars, and journeys.',
        href: '/login?portal=customer',
        title: 'Customer login',
      },
      {
        audience: 'partner',
        description: 'For approved hotel and car owners, suppliers, and partner applicants.',
        href: '/login?portal=partner&returnTo=%2Fpartner',
        title: 'Partner login',
      },
      {
        audience: 'corporate',
        description: 'For corporate clients and employees invited to company travel accounts.',
        href: '/login?portal=corporate&returnTo=%2Fbusiness%2Fdashboard',
        title: 'Corporate login',
      },
      {
        audience: 'admin',
        description: 'Restricted operations access for the sole Mandyal Travels administrator.',
        href: '/login?portal=admin&returnTo=%2Fadmin',
        title: 'Administrator login',
      },
    ];

    return (
      <section className="auth-page auth-page--portal-hub">
        <div className="auth-page__intro">
          <p className="hotel-page__eyebrow">Choose your secure portal</p>
          <h1>Sign in to the right workspace.</h1>
          <p>Customer, partner, corporate, and administrator access remain separated.</p>
        </div>
        <div className="auth-portal-grid">
          {portals.map((portal) => (
            <Card className="auth-portal-card" key={portal.audience}>
              <p className="hotel-page__eyebrow">{portal.audience}</p>
              <h2>{portal.title}</h2>
              <p>{portal.description}</p>
              <Link className="ui-button ui-button--secondary" href={portal.href}>
                Continue
              </Link>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  const copy = {
    admin: {
      description: 'Sign in to the protected Mandyal Travels operations console.',
      eyebrow: 'Restricted administration',
      title: 'Administrator login',
    },
    corporate: {
      description: 'Sign in to manage your company travel account and team.',
      eyebrow: 'Corporate travel',
      title: 'Corporate login',
    },
    customer: {
      description: 'Sign in to manage your personal journeys and account.',
      eyebrow: 'Customer account',
      title: 'Customer login',
    },
    partner: {
      description: 'Sign in to apply or manage your approved hotel or car business.',
      eyebrow: 'Supplier network',
      title: 'Partner login',
    },
  }[audience];

  return (
    <section className="auth-page">
      <div className="auth-page__intro">
        <p className="hotel-page__eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </div>
      <AuthForm
        message={
          values.passwordReset === '1'
            ? 'Your password was reset. Sign in with your new password.'
            : values.passwordChanged === '1'
              ? 'Your password was updated. Sign in again on this device.'
              : undefined
        }
        loginAudience={audience}
        mode="login"
        returnTo={returnTo ?? undefined}
      />
      <p className="auth-portal-switch">
        <Link href="/login">Choose a different login</Link>
      </p>
    </section>
  );
}
