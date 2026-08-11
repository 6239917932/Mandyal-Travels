import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

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
        },
      },
    },
    where: { userId: user.id },
  });

  if (!membership) redirect('/business');

  const memberIds = membership.organization.members.map((member) => member.userId);
  const trips = await prisma.customerTrip.findMany({ where: { userId: { in: memberIds } } });
  const confirmedTrips = trips.filter((trip) => trip.status.toUpperCase() === 'CONFIRMED').length;
  const bookedValue = trips
    .filter((trip) => trip.currency === 'INR')
    .reduce((total, trip) => total + trip.totalAmount, 0);

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
          <Link className="ui-button ui-button--primary" href="/">
            Book company travel
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
          <span>Company bookings</span>
          <strong>{trips.length}</strong>
        </Card>
        <Card>
          <span>Confirmed journeys</span>
          <strong>{confirmedTrips}</strong>
        </Card>
        <Card>
          <span>Booked value</span>
          <strong>{formatCurrency(bookedValue)}</strong>
        </Card>
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

      <form action="/api/v1/auth/logout" method="post">
        <button className="ui-button ui-button--secondary" type="submit">
          Sign out
        </button>
      </form>
    </section>
  );
}
