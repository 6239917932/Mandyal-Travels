import type { Metadata } from 'next';
import Link from 'next/link';

import { BusinessInvitationAcceptance } from '@/components/business/BusinessInvitationAcceptance';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import {
  hashBusinessInvitationToken,
  isBusinessInvitationActive,
} from '@/services/businessInvitationService';

export const metadata: Metadata = { title: 'Company traveller invitation' };

type BusinessInvitationPageProps = { params: Promise<{ token: string }> };

function maskEmail(email: string) {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(2, name.length - 2))}@${domain}`;
}

export default async function BusinessInvitationPage({ params }: BusinessInvitationPageProps) {
  const { token } = await params;
  const [user, invitation] = await Promise.all([
    getCurrentUser(),
    prisma.organizationInvitation.findUnique({
      include: { organization: { select: { name: true } } },
      where: { tokenHash: hashBusinessInvitationToken(token) },
    }),
  ]);

  const isActive = invitation
    ? isBusinessInvitationActive(invitation.status, invitation.expiresAt)
    : false;
  const returnTo = `/business/invitations/${token}`;

  return (
    <section className="auth-page">
      <div className="auth-page__intro">
        <p className="hotel-page__eyebrow">Company traveller invitation</p>
        <h1>
          {invitation && isActive
            ? `Join ${invitation.organization.name}.`
            : 'Invitation unavailable.'}
        </h1>
        <p>
          {isActive
            ? 'Accept this invitation to request and book travel under the organization policy.'
            : 'This invitation is invalid, expired, accepted, or revoked.'}
        </p>
      </div>

      {invitation && isActive ? (
        <Card className="business-invitation">
          <div>
            <span>Invited account</span>
            <strong>{maskEmail(invitation.email)}</strong>
          </div>
          <div>
            <span>Access</span>
            <strong>Company traveller</strong>
          </div>
          <div>
            <span>Invitation expires</span>
            <strong>{invitation.expiresAt.toLocaleDateString('en-IN')}</strong>
          </div>

          {!user ? (
            <div className="business-invitation__actions">
              <Link
                className="ui-button ui-button--primary"
                href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
              >
                Sign in to accept
              </Link>
              <Link
                className="ui-button ui-button--secondary"
                href={`/register?returnTo=${encodeURIComponent(returnTo)}`}
              >
                Create traveller account
              </Link>
            </div>
          ) : user.email === invitation.email ? (
            <BusinessInvitationAcceptance
              organizationName={invitation.organization.name}
              token={token}
            />
          ) : (
            <div className="business-invitation__actions">
              <p className="auth-form__error" role="alert">
                You are signed in as {user.email}. Sign in with the invited account to continue.
              </p>
              <form action="/api/v1/auth/logout" method="post">
                <button className="ui-button ui-button--secondary" type="submit">
                  Sign out
                </button>
              </form>
            </div>
          )}
        </Card>
      ) : null}
    </section>
  );
}
