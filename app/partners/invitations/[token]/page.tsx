import type { Metadata } from 'next';
import Link from 'next/link';

import { PartnerInvitationAcceptance } from '@/components/partner/PartnerInvitationAcceptance';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import {
  hashPartnerInvitationToken,
  isPartnerInvitationActive,
} from '@/services/partnerAccessService';

export const metadata: Metadata = { title: 'Supplier team invitation' };

function maskEmail(email: string) {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(2, name.length - 2))}@${domain}`;
}

export default async function PartnerInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [user, invitation] = await Promise.all([
    getCurrentUser(),
    prisma.partnerMemberInvitation.findUnique({
      include: { partner: { select: { name: true } } },
      where: { tokenHash: hashPartnerInvitationToken(token) },
    }),
  ]);
  const isActive = invitation
    ? isPartnerInvitationActive(invitation.status, invitation.expiresAt)
    : false;
  const returnTo = `/partners/invitations/${token}`;

  return (
    <section className="auth-page">
      <div className="auth-page__intro">
        <p className="hotel-page__eyebrow">Verified supplier team invitation</p>
        <h1>
          {invitation && isActive ? `Join ${invitation.partner.name}.` : 'Invitation unavailable.'}
        </h1>
        <p>
          {isActive
            ? 'Accept the invitation to work only inside this supplier workspace.'
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
            <strong>
              {invitation.role === 'ADMIN' ? 'Supplier administrator' : 'Supplier operator'}
            </strong>
          </div>
          <div>
            <span>Invitation expires</span>
            <strong>{invitation.expiresAt.toLocaleDateString('en-IN')}</strong>
          </div>

          {!user ? (
            <div className="business-invitation__actions">
              <Link
                className="ui-button ui-button--primary"
                href={`/login?portal=partner&returnTo=${encodeURIComponent(returnTo)}`}
              >
                Sign in to accept
              </Link>
              <Link
                className="ui-button ui-button--secondary"
                href={`/register?returnTo=${encodeURIComponent(returnTo)}`}
              >
                Create an account
              </Link>
            </div>
          ) : user.email === invitation.email ? (
            <PartnerInvitationAcceptance partnerName={invitation.partner.name} token={token} />
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
