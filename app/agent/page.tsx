import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AgencyCustomerManager } from '@/components/agent/AgencyCustomerManager';
import { AgencyTravelRequestManager } from '@/components/agent/AgencyTravelRequestManager';
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
  const [agencyCustomers, agencyRequests, requests, booked] = await Promise.all([
    prisma.agencyCustomer.findMany({
      include: { _count: { select: { travelRequests: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      where: { organizationId: membership.organizationId },
    }),
    prisma.agencyCustomerTravelRequest.findMany({
      include: { agencyCustomer: true, businessTravelRequest: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
      where: { agencyCustomer: { organizationId: membership.organizationId } },
    }),
    prisma.businessTravelRequest.count({ where: { organizationId: membership.organizationId } }),
    prisma.businessTravelRequest.count({
      where: { organizationId: membership.organizationId, status: 'BOOKED' },
    }),
  ]);
  const agencyWorkspaceRevision = agencyCustomers
    .map(
      (customer) =>
        `${customer.id}:${customer.status}:${customer.updatedAt.toISOString()}:${customer._count.travelRequests}`,
    )
    .join('|');
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
          <strong>
            {agencyCustomers.filter((customer) => customer.status === 'ACTIVE').length}
          </strong>
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
      <AgencyTravelRequestManager
        customers={agencyCustomers.map((customer) => ({
          displayName: customer.displayName,
          email: customer.email,
          id: customer.id,
          notes: customer.notes,
          phone: customer.phone,
          requestCount: customer._count.travelRequests,
          status: customer.status,
        }))}
        initialRequests={agencyRequests.map(({ agencyCustomer, businessTravelRequest }) => ({
          customerName: agencyCustomer.displayName,
          estimatedAmount: businessTravelRequest.estimatedAmount,
          id: businessTravelRequest.id,
          productType: businessTravelRequest.productType,
          startDate: businessTravelRequest.startDate,
          status: businessTravelRequest.status,
          title: businessTravelRequest.title,
        }))}
        key={`${agencyWorkspaceRevision}:requests`}
      />
      <AgencyCustomerManager
        initialCustomers={agencyCustomers.map((customer) => ({
          displayName: customer.displayName,
          email: customer.email,
          id: customer.id,
          notes: customer.notes,
          phone: customer.phone,
          requestCount: customer._count.travelRequests,
          status: customer.status,
        }))}
        key={`${agencyWorkspaceRevision}:customers`}
      />
    </section>
  );
}
