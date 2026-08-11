import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { BusinessApprovalQueue } from '@/components/business/BusinessApprovalQueue';
import { BusinessAuditTimeline } from '@/components/business/BusinessAuditTimeline';
import { BusinessMemberManager } from '@/components/business/BusinessMemberManager';
import { BusinessOrganizationProfile } from '@/components/business/BusinessOrganizationProfile';
import { BusinessPolicyManager } from '@/components/business/BusinessPolicyManager';
import { BusinessSupportCenter } from '@/components/business/BusinessSupportCenter';
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
            orderBy: { createdAt: 'asc' },
            take: 20,
          },
          invitations: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            where: { expiresAt: { gt: new Date() }, status: 'PENDING' },
          },
          auditEntries: {
            include: {
              actor: { select: { firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
          policyVersions: {
            include: {
              createdBy: { select: { firstName: true, lastName: true } },
            },
            orderBy: { version: 'desc' },
            take: 10,
          },
          supportCases: {
            include: {
              createdBy: { select: { firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
        },
      },
    },
    where: { role: 'ADMIN', userId: user.id },
  });

  if (!membership) redirect('/business');

  const requestInclude = {
    customerTrip: { select: { confirmationCode: true } },
    hotelBooking: { select: { confirmationCode: true } },
    requester: { select: { email: true, firstName: true, lastName: true } },
  } as const;
  const organizationId = membership.organizationId;
  const [
    pendingTravelRequests,
    recentTravelRequests,
    totalRequests,
    pendingRequestCount,
    bookedRequests,
    bookedValue,
    openSupportCases,
    supportCaseCount,
    memberCount,
    pendingInvitationCount,
  ] = await Promise.all([
    prisma.businessTravelRequest.findMany({
      include: requestInclude,
      orderBy: { createdAt: 'asc' },
      take: 50,
      where: { organizationId, status: 'PENDING' },
    }),
    prisma.businessTravelRequest.findMany({
      include: requestInclude,
      orderBy: { createdAt: 'desc' },
      take: 20,
      where: { organizationId, status: { not: 'PENDING' } },
    }),
    prisma.businessTravelRequest.count({ where: { organizationId } }),
    prisma.businessTravelRequest.count({ where: { organizationId, status: 'PENDING' } }),
    prisma.businessTravelRequest.count({ where: { organizationId, status: 'BOOKED' } }),
    prisma.businessTravelRequest.aggregate({
      _sum: { bookingTotalAmount: true },
      where: { currency: 'INR', organizationId, status: 'BOOKED' },
    }),
    prisma.businessSupportCase.count({ where: { organizationId, status: 'OPEN' } }),
    prisma.businessSupportCase.count({ where: { organizationId } }),
    prisma.organizationMember.count({ where: { organizationId } }),
    prisma.organizationInvitation.count({
      where: { expiresAt: { gt: new Date() }, organizationId, status: 'PENDING' },
    }),
  ]);
  const travelRequests = [...pendingTravelRequests, ...recentTravelRequests];

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
          <Link className="ui-button ui-button--secondary" href="/business/audit">
            Audit log
          </Link>
          <Link className="ui-button ui-button--secondary" href="/business/reports">
            Company report
          </Link>
          <Link className="ui-button ui-button--secondary" href="/business/statements">
            Company statements
          </Link>
          <Link className="ui-button ui-button--secondary" href="/business/support">
            Support cases
          </Link>
          <Link className="ui-button ui-button--secondary" href="/business/members">
            Team access
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
          <strong>{memberCount}</strong>
        </Card>
        <Card>
          <span>Travel requests</span>
          <strong>{totalRequests}</strong>
        </Card>
        <Card>
          <span>Pending approvals</span>
          <strong>{pendingRequestCount}</strong>
        </Card>
        <Card>
          <span>Confirmed company journeys</span>
          <strong>{bookedRequests}</strong>
        </Card>
        <Card>
          <span>Booked company value</span>
          <strong>{formatCurrency(bookedValue._sum.bookingTotalAmount ?? 0)}</strong>
        </Card>
        <Card>
          <span>Open support cases</span>
          <strong>{openSupportCases}</strong>
        </Card>
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Organization profile</p>
          <h2>Company contact details</h2>
        </div>
        <BusinessOrganizationProfile
          billingAddress={membership.organization.billingAddress ?? ''}
          contactEmail={membership.organization.contactEmail ?? user.email}
          contactPhone={membership.organization.contactPhone ?? ''}
          legalName={membership.organization.legalName ?? membership.organization.name}
          name={membership.organization.name}
          taxRegistrationId={membership.organization.taxRegistrationId ?? ''}
        />
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
        {totalRequests > travelRequests.length ? (
          <p className="booking-confirmation__note">
            The 50 oldest pending approvals and the 20 most recent reviewed requests are shown here.
            Open the <Link href="/business/reports">company report</Link> for the complete
            searchable history.
          </p>
        ) : null}
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Organization access</p>
          <h2>Team members</h2>
        </div>
        <BusinessMemberManager
          invitations={membership.organization.invitations.map((invitation) => ({
            email: invitation.email,
            expiresAt: invitation.expiresAt.toISOString(),
            id: invitation.id,
          }))}
          members={membership.organization.members.map((member) => ({
            email: member.user.email,
            id: member.id,
            isCurrentUser: member.userId === user.id,
            name: `${member.user.firstName} ${member.user.lastName}`,
            role: member.role,
          }))}
        />
        {memberCount > membership.organization.members.length ||
        pendingInvitationCount > membership.organization.invitations.length ? (
          <p className="booking-confirmation__note">
            This dashboard shows the first 20 members and latest 20 active invitations. Open{' '}
            <Link href="/business/members">Team access</Link> to manage the complete member list.
          </p>
        ) : null}
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Business controls</p>
          <h2>Travel policy and approvals</h2>
        </div>
        <BusinessPolicyManager
          initialHistory={membership.organization.policyVersions.map((version) => ({
            approvalRequired: version.approvalRequired,
            createdAt: version.createdAt.toISOString(),
            createdByName: version.createdBy
              ? `${version.createdBy.firstName} ${version.createdBy.lastName}`
              : null,
            defaultCabinClass: version.defaultCabinClass,
            maximumTripAmount: version.maximumTripAmount,
            version: version.version,
          }))}
          initialPolicy={{
            approvalRequired: membership.organization.approvalRequired,
            defaultCabinClass: membership.organization.defaultCabinClass,
            maximumTripAmount: membership.organization.maximumTripAmount,
          }}
        />
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Account servicing</p>
          <h2>Organization support center</h2>
          <p>
            Raise and track booking, billing, account, or technical requests for this organization.
          </p>
        </div>
        <BusinessSupportCenter
          cases={membership.organization.supportCases.map((supportCase) => ({
            bookingReference: supportCase.bookingReference,
            caseNumber: supportCase.caseNumber,
            category: supportCase.category,
            createdAt: supportCase.createdAt.toISOString(),
            createdByName: `${supportCase.createdBy.firstName} ${supportCase.createdBy.lastName}`,
            id: supportCase.id,
            message: supportCase.message,
            status: supportCase.status,
            subject: supportCase.subject,
          }))}
        />
        {supportCaseCount > membership.organization.supportCases.length ? (
          <p className="booking-confirmation__note">
            The 20 most recent organization support cases are shown here. Open{' '}
            <Link href="/business/support">Support cases</Link> for the complete history.
          </p>
        ) : null}
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
