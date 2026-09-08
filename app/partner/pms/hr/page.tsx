import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'HR and payroll | Mandyal PMS' };

export default async function PartnerHrPage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partner');
  const members = await prisma.supplyPartnerMember.findMany({
    include: { user: { select: { email: true, firstName: true, lastName: true } } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: 501,
    where: { partnerId: access.partnerId },
  });
  const bounded = members.slice(0, 500);
  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">People operations · controlled foundation</p>
            <h1>HR and payroll</h1>
            <p className="booking-page__intro">
              Use named supplier accounts as the staff access roster without storing salary, bank,
              tax, identity, attendance, or medical data in an unfinished payroll system.
            </p>
          </div>
          <Link className="ui-button ui-button--secondary" href="/partner/access">
            Manage team access
          </Link>
        </header>
        {members.length > 500 ? (
          <p className="booking-page__payment-error" role="alert">
            Roster safety limit reached. Use the paginated access directory.
          </p>
        ) : null}
        <div className="partner-bookings__summary">
          <Card>
            <span>Named accounts</span>
            <strong>{bounded.length}</strong>
          </Card>
          <Card>
            <span>Administrators</span>
            <strong>{bounded.filter((item) => item.role === 'ADMIN').length}</strong>
          </Card>
          <Card>
            <span>Operators</span>
            <strong>{bounded.filter((item) => item.role !== 'ADMIN').length}</strong>
          </Card>
          <Card>
            <span>Payroll processing</span>
            <strong>Not released</strong>
          </Card>
        </div>
        <Card>
          <p className="hotel-page__eyebrow">Access-backed roster</p>
          <h2>Authorized PMS users</h2>
          <ul className="pms-room-rack__queue-list">
            {bounded.map((member) => (
              <li key={member.id}>
                <strong>
                  {`${member.user.firstName} ${member.user.lastName}`.trim() || 'Named user'}
                </strong>
                <span>{member.user.email}</span>
                <small>
                  {member.role === 'ADMIN' ? 'Supplier administrator' : 'Supplier operator'} ·
                  access granted {member.createdAt.toLocaleDateString('en-IN')}
                </small>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <p>
            Employment contracts, statutory payroll, provident-fund/ESI treatment, tax withholding,
            bank files, leave policy, and biometric attendance require separate legal, privacy, and
            finance approval before implementation.
          </p>
        </Card>
      </div>
    </main>
  );
}
