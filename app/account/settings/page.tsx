import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AccountProfileForm } from '@/components/account/AccountProfileForm';
import { MfaSecurityManager } from '@/components/account/MfaSecurityManager';
import { PasswordChangeForm } from '@/components/account/PasswordChangeForm';
import { PrivacyRequestManager } from '@/components/account/PrivacyRequestManager';
import { SessionManager } from '@/components/account/SessionManager';
import { getCurrentSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Account settings' };

const RECENT_ITEM_LIMIT = 20;

export default async function AccountSettingsPage() {
  const currentSession = await getCurrentSession();
  if (!currentSession) redirect('/login');
  const { user } = currentSession;

  const [activeSessions, securityEvents, privacyRequests] = await Promise.all([
    prisma.userSession.findMany({
      orderBy: { lastSeenAt: 'desc' },
      select: { createdAt: true, expiresAt: true, id: true, lastSeenAt: true },
      where: { expiresAt: { gt: new Date() }, userId: user.id },
    }),
    prisma.accountSecurityEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: RECENT_ITEM_LIMIT,
      where: { userId: user.id },
    }),
    prisma.dataPrivacyRequest.findMany({
      orderBy: { requestedAt: 'desc' },
      take: RECENT_ITEM_LIMIT,
      where: { userId: user.id },
    }),
  ]);

  return (
    <section className="account-page account-settings-page">
      <div className="account-trips__heading account-settings-page__heading">
        <p className="hotel-page__eyebrow">Account settings</p>
        <h1>Profile, privacy, and security</h1>
        <p>Manage your personal details and protect your Mandyal Travels account.</p>
        <Link href="/account">Back to my account</Link>
      </div>

      <AccountProfileForm email={user.email} firstName={user.firstName} lastName={user.lastName} />
      <PasswordChangeForm />
      <MfaSecurityManager />

      <SessionManager
        sessions={activeSessions.map((session) => ({
          createdAt: session.createdAt.toISOString(),
          expiresAt: session.expiresAt.toISOString(),
          id: session.id,
          isCurrent: session.id === currentSession.id,
          lastSeenAt: session.lastSeenAt.toISOString(),
        }))}
      />

      <section className="account-trips" aria-labelledby="security-activity-heading">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Account protection</p>
          <h2 id="security-activity-heading">Recent security activity</h2>
          <p>Review recent sign-ins and important account changes.</p>
        </div>
        {securityEvents.length > 0 ? (
          <div className="account-trips__list">
            {securityEvents.map((event) => (
              <article className="account-trip ui-card ui-card--padded" key={event.id}>
                <div className="account-trip__topline">
                  <strong>{event.action.replaceAll('_', ' ')}</strong>
                  <time dateTime={event.createdAt.toISOString()}>
                    {new Intl.DateTimeFormat('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(event.createdAt)}
                  </time>
                </div>
                <p>{event.summary}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="account-trips__empty ui-card ui-card--padded">
            <strong>No security activity yet.</strong>
            <p>New sign-ins and important account changes will appear here.</p>
          </div>
        )}
      </section>

      <section className="account-trips" aria-labelledby="account-data-heading">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Your data</p>
          <h2 id="account-data-heading">Download account data</h2>
          <p>Download a private copy of the information connected to your account.</p>
        </div>
        <div className="account-trips__empty ui-card ui-card--padded">
          <strong>Private account archive</strong>
          <p>Your password, session tokens, and payment-card details are never included.</p>
          <a className="ui-button ui-button--secondary" href="/api/v1/account/export">
            Download my data
          </a>
        </div>
      </section>

      <PrivacyRequestManager
        initialRequests={privacyRequests.map((request) => ({
          dueAt: request.dueAt.toISOString(),
          id: request.id,
          requestType: request.requestType,
          requestedAt: request.requestedAt.toISOString(),
          resolutionNote: request.resolutionNote,
          status: request.status,
        }))}
      />
    </section>
  );
}
