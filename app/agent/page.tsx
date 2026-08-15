import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AgencyCustomerManager } from '@/components/agent/AgencyCustomerManager';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export default async function AgentWorkspacePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/agent');
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id, role: 'ADMIN', organization: { type: 'TRAVEL_AGENCY' } },
    include: { organization: true },
  });
  if (!membership) redirect('/business');
  const [customers, requests, booked] = await Promise.all([
    prisma.agencyCustomer.count({
      where: { organizationId: membership.organizationId, status: 'ACTIVE' },
    }),
    prisma.businessTravelRequest.count({ where: { organizationId: membership.organizationId } }),
    prisma.businessTravelRequest.count({
      where: { organizationId: membership.organizationId, status: 'BOOKED' },
    }),
  ]);
  return (
    <section className="account-page">
      <div className="auth-page__intro">
        <p className="hotel-page__eyebrow">B2B agent workspace</p>
        <h1>{membership.organization.name}</h1>
        <p>
          Manage customer profiles, requests, bookings, statements, support, and audit evidence.
        </p>
      </div>
      <div className="booking-summary-grid">
        <div className="ui-card ui-card--padded">
          <strong>{customers}</strong>
          <span> Active customers</span>
        </div>
        <div className="ui-card ui-card--padded">
          <strong>{requests}</strong>
          <span> Travel requests</span>
        </div>
        <div className="ui-card ui-card--padded">
          <strong>{booked}</strong>
          <span> Booked requests</span>
        </div>
      </div>
      <div className="manage-booking__document-actions">
        <Link className="ui-button ui-button--secondary" href="/business/dashboard">
          Agency operations
        </Link>
        <Link className="ui-button ui-button--secondary" href="/business/statements">
          Statements
        </Link>
        <Link className="ui-button ui-button--secondary" href="/business/support">
          Support
        </Link>
      </div>
      <AgencyCustomerManager />
    </section>
  );
}
