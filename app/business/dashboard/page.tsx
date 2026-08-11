import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { BusinessApprovalQueue } from '@/components/business/BusinessApprovalQueue';
import { BusinessAuditTimeline } from '@/components/business/BusinessAuditTimeline';
import { BusinessMemberManager } from '@/components/business/BusinessMemberManager';
import { BusinessPolicyManager } from '@/components/business/BusinessPolicyManager';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Business workspace' };

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default async function BusinessDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'BUSINESS_ADMIN') redirect('/business');

  const membership = await prisma.organizationMember.findFirst({
    include: {
      organization: {
        include: {
          members: {
            include: {
              user: { select: { email: true, firstName: true, lastName: true, role: true } },
            },
          },
          auditEntries: {
            include: {
              actor: { select: { firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
          travelRequests: {
            include: {
              customerTrip: { select: { confirmationCode: true } },
              hotelBooking: { select: { confirmationCode: true } },
              requester: { select: { email: true, firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
    where: { role: 'ADMIN', userId: user.id },
  });

  if (!membership) redirect('/business');

  const travelRequests = membership.organization.travelRequests;
  const pendingRequests = travelRequests.filter((request) => request.status === 'PENDING').length;
  const bookedRequests = travelRequests.filter((request) => request.status === 'BOOKED').length;
  const bookedValue = travelRequests
    .filter((request) => request.status === 'BOOKED' && request.currency === 'INR')
    .reduce((total, request) => total + (request.bookingTotalAmount ?? 0), 0);

  return (
    <section className="account-page">
      <div className="auth-page__intro">
        <p className="hotel-page__eyebrow">Business workspace</p>
        <h1>{membership.organization.name}</h1>
        <p>Manage organization travel separately from a personal customer profile.</p>
      </div>

      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Organization reporting</p>
          <h2>Company travel summary</h2>
        </div>
        <div className="manage-booking__document-actions">
          <Link className="ui-button ui-button--secondary" href="/business/statements">
            Company statements
          </Link>
          <Link className="ui-button ui-button--primary" href="/account#company-travel-request">
            Create company request
          </Link>
          <Link className="ui-button ui-button--secondary" href="/account">
            Personal account settings
          </Link>
        </div>
      </div>

      <div className="partner-bookings__summary">
        <Card>
          <span>Team members</span>
          <strong>{membership.organization.members.length}</strong>
        </Card>
        <Card>
          <span>Travel requests</span>
          <strong>{travelRequests.length}</strong>
        </Card>
        <Card>
          <span>Pending approvals</span>
          <strong>{pendingRequests}</strong>
        </Card>
        <Card>
          <span>Confirmed company journeys</span>
          <strong>{bookedRequests}</strong>
        </Card>
        <Card>
          <span>Booked company value</span>
          <strong>{formatCurrency(bookedValue)}</strong>
        </Card>
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Approval center</p>
          <h2>Company travel requests</h2>
        </div>
        <BusinessApprovalQueue
          requests={travelRequests.map((request) => ({
            bookedAt: request.bookedAt?.toISOString() ?? null,
            bookingReference:
              request.customerTrip?.confirmationCode ??
              request.hotelBooking?.confirmationCode ??
              null,
            bookingTotalAmount: request.bookingTotalAmount,
            currency: request.currency,
            endDate: request.endDate,
            estimatedAmount: request.estimatedAmount,
            id: request.id,
            policyReason: request.policyReason,
            productType: request.productType,
            requesterEmail: request.requester.email,
            requesterName: `${request.requester.firstName} ${request.requester.lastName}`,
            reviewNote: request.reviewNote,
            startDate: request.startDate,
            status: request.status,
            title: request.title,
          }))}
        />
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Organization access</p>
          <h2>Team members</h2>
        </div>
        <BusinessMemberManager
          members={membership.organization.members.map((member) => ({
            email: member.user.email,
            id: member.id,
            name: `${member.user.firstName} ${member.user.lastName}`,
            role: member.role,
          }))}
        />
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Business controls</p>
          <h2>Travel policy and approvals</h2>
        </div>
        <BusinessPolicyManager
          initialPolicy={{
            approvalRequired: membership.organization.approvalRequired,
            defaultCabinClass: membership.organization.defaultCabinClass,
            maximumTripAmount: membership.organization.maximumTripAmount,
          }}
        />
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Audit history</p>
          <h2>Recent company activity</h2>
        </div>
        <BusinessAuditTimeline
          entries={membership.organization.auditEntries.map((entry) => ({
            action: entry.action,
            actorName: entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : null,
            createdAt: entry.createdAt.toISOString(),
            id: entry.id,
            summary: entry.summary,
          }))}
        />
      </div>

      <form action="/api/v1/auth/logout" method="post">
        <button className="ui-button ui-button--secondary" type="submit">
          Sign out
        </button>
      </form>
    </section>
  );
}
