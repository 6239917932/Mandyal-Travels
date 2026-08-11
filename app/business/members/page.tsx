import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { BusinessMemberManager } from '@/components/business/BusinessMemberManager';
import { Card } from '@/components/ui/Card';
import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Team access' };

const PAGE_SIZE = 50;

function readPage(value: string | string[] | undefined) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function BusinessMembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await getBusinessAdminMembership();
  if (!access) redirect('/business');

  const parameters = await searchParams;
  const requestedPage = readPage(parameters.page);
  const requestedInvitationPage = readPage(parameters.invitationPage);
  const organizationId = access.membership.organizationId;
  const now = new Date();
  const [organization, memberCount, pendingInvitationCount] = await Promise.all([
    prisma.organization.findUnique({
      select: { name: true },
      where: { id: organizationId },
    }),
    prisma.organizationMember.count({ where: { organizationId } }),
    prisma.organizationInvitation.count({
      where: { expiresAt: { gt: now }, organizationId, status: 'PENDING' },
    }),
  ]);
  if (!organization) redirect('/business');

  const totalPages = Math.max(1, Math.ceil(memberCount / PAGE_SIZE));
  const invitationTotalPages = Math.max(1, Math.ceil(pendingInvitationCount / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const invitationPage = Math.min(requestedInvitationPage, invitationTotalPages);
  const [members, invitations] = await Promise.all([
    prisma.organizationMember.findMany({
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      where: { organizationId },
    }),
    prisma.organizationInvitation.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (invitationPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      where: { expiresAt: { gt: now }, organizationId, status: 'PENDING' },
    }),
  ]);

  return (
    <section className="account-page">
      <div className="auth-page__intro">
        <p className="hotel-page__eyebrow">Organization access</p>
        <h1>Team access</h1>
        <p>Invite travellers and maintain administrator access for {organization.name}.</p>
      </div>

      <div className="partner-bookings__summary">
        <Card>
          <span>Team members</span>
          <strong>{memberCount}</strong>
        </Card>
        <Card>
          <span>Active invitations</span>
          <strong>{pendingInvitationCount}</strong>
        </Card>
      </div>

      <BusinessMemberManager
        invitations={invitations.map((invitation) => ({
          email: invitation.email,
          expiresAt: invitation.expiresAt.toISOString(),
          id: invitation.id,
        }))}
        members={members.map((member) => ({
          email: member.user.email,
          id: member.id,
          isCurrentUser: member.userId === access.user.id,
          name: `${member.user.firstName} ${member.user.lastName}`,
          role: member.role,
        }))}
      />

      {invitationTotalPages > 1 ? (
        <nav aria-label="Active invitation pages" className="business-audit-pagination">
          {invitationPage > 1 ? (
            <Link
              className="ui-button ui-button--secondary"
              href={`/business/members?page=${page}&invitationPage=${invitationPage - 1}`}
            >
              Previous invitations
            </Link>
          ) : null}
          <span>
            Invitation page {invitationPage} of {invitationTotalPages}
          </span>
          {invitationPage < invitationTotalPages ? (
            <Link
              className="ui-button ui-button--secondary"
              href={`/business/members?page=${page}&invitationPage=${invitationPage + 1}`}
            >
              Next invitations
            </Link>
          ) : null}
        </nav>
      ) : null}

      <nav aria-label="Team member pages" className="business-audit-pagination">
        {page > 1 ? (
          <Link
            className="ui-button ui-button--secondary"
            href={`/business/members?page=${page - 1}&invitationPage=${invitationPage}`}
          >
            Previous page
          </Link>
        ) : null}
        <span>
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Link
            className="ui-button ui-button--secondary"
            href={`/business/members?page=${page + 1}&invitationPage=${invitationPage}`}
          >
            Next page
          </Link>
        ) : null}
      </nav>

      <Link className="ui-button ui-button--secondary" href="/business/dashboard">
        Back to business workspace
      </Link>
    </section>
  );
}
