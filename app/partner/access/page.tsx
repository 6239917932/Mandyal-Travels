import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PartnerAccessManager } from '@/components/partner/PartnerAccessManager';
import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Supplier team access' };
const PAGE_SIZE = 50;

function readPage(value: string | string[] | undefined) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function PartnerAccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await getPartnerAccess();
  if (!access?.partnerId || !access.userId) redirect('/partners');
  const parameters = await searchParams;
  const requestedMemberPage = readPage(parameters.page);
  const requestedInvitationPage = readPage(parameters.invitationPage);
  const now = new Date();
  const [memberCount, invitationCount] = await Promise.all([
    prisma.supplyPartnerMember.count({ where: { partnerId: access.partnerId } }),
    prisma.partnerMemberInvitation.count({
      where: { expiresAt: { gt: now }, partnerId: access.partnerId, status: 'PENDING' },
    }),
  ]);
  const memberPages = Math.max(1, Math.ceil(memberCount / PAGE_SIZE));
  const invitationPages = Math.max(1, Math.ceil(invitationCount / PAGE_SIZE));
  const page = Math.min(requestedMemberPage, memberPages);
  const invitationPage = Math.min(requestedInvitationPage, invitationPages);
  const [members, invitations] = await Promise.all([
    prisma.supplyPartnerMember.findMany({
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      where: { partnerId: access.partnerId },
    }),
    prisma.partnerMemberInvitation.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (invitationPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      where: { expiresAt: { gt: now }, partnerId: access.partnerId, status: 'PENDING' },
    }),
  ]);

  return (
    <section className="account-page partner-workspace">
      <div className="account-page__container">
        <header className="account-trips__heading">
          <p className="hotel-page__eyebrow">Least-privilege supplier administration</p>
          <h1>Team access</h1>
          <p>
            Invite named accounts, assign administrator or operator access, and preserve an
            immutable history for {access.partnerName}.
          </p>
          <Link className="ui-button ui-button--secondary" href="/partner/activity">
            Open activity log
          </Link>
        </header>
        <div className="partner-bookings__summary">
          <Card>
            <span>Active members</span>
            <strong>{memberCount}</strong>
          </Card>
          <Card>
            <span>Pending invitations</span>
            <strong>{invitationCount}</strong>
          </Card>
          <Card>
            <span>Your role</span>
            <strong>{access.memberRole === 'ADMIN' ? 'Administrator' : 'Operator'}</strong>
          </Card>
        </div>
        <PartnerAccessManager
          canManage={access.memberRole === 'ADMIN'}
          invitations={invitations.map((item) => ({
            email: item.email,
            expiresAt: item.expiresAt.toISOString(),
            id: item.id,
            role: item.role,
          }))}
          members={members.map((member) => ({
            email: member.user.email,
            id: member.id,
            isCurrentUser: member.userId === access.userId,
            name: `${member.user.firstName} ${member.user.lastName}`,
            role: member.role,
          }))}
        />
        <nav aria-label="Access directory pages" className="business-audit-pagination">
          {page > 1 ? (
            <Link
              className="ui-button ui-button--secondary"
              href={`/partner/access?page=${page - 1}&invitationPage=${invitationPage}`}
            >
              Previous members
            </Link>
          ) : null}
          <span>
            Member page {page} of {memberPages} · Invitation page {invitationPage} of{' '}
            {invitationPages}
          </span>
          {page < memberPages ? (
            <Link
              className="ui-button ui-button--secondary"
              href={`/partner/access?page=${page + 1}&invitationPage=${invitationPage}`}
            >
              Next members
            </Link>
          ) : null}
        </nav>
        {invitationPages > 1 ? (
          <nav aria-label="Pending invitation pages" className="business-audit-pagination">
            {invitationPage > 1 ? (
              <Link
                className="ui-button ui-button--secondary"
                href={`/partner/access?page=${page}&invitationPage=${invitationPage - 1}`}
              >
                Previous invitations
              </Link>
            ) : null}
            <span>
              Invitation page {invitationPage} of {invitationPages}
            </span>
            {invitationPage < invitationPages ? (
              <Link
                className="ui-button ui-button--secondary"
                href={`/partner/access?page=${page}&invitationPage=${invitationPage + 1}`}
              >
                Next invitations
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </section>
  );
}
