import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'User servicing record' };

type Props = { params: Promise<{ userId: string }> };

function formatCurrency(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

export default async function AdminUserDetailPage({ params }: Props) {
  const administrator = await getPlatformAdmin();
  if (!administrator) redirect('/login?returnTo=/admin/users');

  const { userId } = await params;
  const user = await prisma.user.findUnique({
    select: {
      bookingEmailEnabled: true,
      createdAt: true,
      customerSupportCases: {
        orderBy: { updatedAt: 'desc' },
        select: { caseNumber: true, category: true, status: true, subject: true, updatedAt: true },
        take: 20,
      },
      email: true,
      emailVerifiedAt: true,
      firstName: true,
      id: true,
      lastName: true,
      marketingConsentAt: true,
      organizationMemberships: {
        orderBy: { createdAt: 'desc' },
        select: {
          createdAt: true,
          organization: { select: { id: true, name: true, type: true } },
          role: true,
        },
      },
      role: true,
      securityEvents: {
        orderBy: { createdAt: 'desc' },
        select: { action: true, createdAt: true, summary: true },
        take: 20,
      },
      smsAlertsEnabled: true,
      trips: {
        orderBy: { createdAt: 'desc' },
        select: {
          confirmationCode: true,
          createdAt: true,
          currency: true,
          productType: true,
          startDate: true,
          status: true,
          title: true,
          totalAmount: true,
        },
        take: 20,
      },
      updatedAt: true,
      whatsappAlertsEnabled: true,
    },
    where: { id: userId },
  });
  if (!user) notFound();

  const now = new Date();
  const [hotelBookings, hotelBookingCount, tripCount, supportCaseCount, activeSessions] =
    await Promise.all([
      prisma.booking.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          confirmationCode: true,
          createdAt: true,
          currency: true,
          hotelSlug: true,
          quote: { select: { checkInDate: true, checkOutDate: true } },
          status: true,
          totalAmount: true,
        },
        take: 20,
        where: { guest: { is: { email: user.email } } },
      }),
      prisma.booking.count({ where: { guest: { is: { email: user.email } } } }),
      prisma.customerTrip.count({ where: { userId: user.id } }),
      prisma.customerSupportCase.count({ where: { userId: user.id } }),
      prisma.userSession.count({ where: { expiresAt: { gt: now }, userId: user.id } }),
    ]);

  return (
    <section className="account-page business-report admin-record-page admin-workspace">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Authorized account servicing</p>
          <h1>
            {user.firstName} {user.lastName}
          </h1>
          <p>{user.email}</p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/admin/users">
          Back to user directory
        </Link>
      </div>

      <div className="admin-record-summary">
        <Card>
          <span>Account role</span>
          <strong>{user.role.replaceAll('_', ' ')}</strong>
        </Card>
        <Card>
          <span>Active sessions</span>
          <strong>{activeSessions}</strong>
        </Card>
        <Card>
          <span>Transport records</span>
          <strong>{tripCount}</strong>
        </Card>
        <Card>
          <span>Hotel records</span>
          <strong>{hotelBookingCount}</strong>
        </Card>
        <Card>
          <span>Support cases</span>
          <strong>{supportCaseCount}</strong>
        </Card>
      </div>

      <div className="admin-record-grid">
        <Card className="admin-record-card">
          <p className="hotel-page__eyebrow">Profile and access</p>
          <dl className="admin-record-list">
            <div>
              <dt>Email status</dt>
              <dd>
                {user.emailVerifiedAt
                  ? `Verified ${formatDate(user.emailVerifiedAt)}`
                  : user.role === 'PLATFORM_ADMIN'
                    ? 'Locally provisioned administrator'
                    : 'Not verified'}
              </dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatDate(user.createdAt)}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>{formatDate(user.updatedAt)}</dd>
            </div>
            <div>
              <dt>Booking emails</dt>
              <dd>{user.bookingEmailEnabled ? 'Enabled' : 'Disabled'}</dd>
            </div>
            <div>
              <dt>SMS alerts</dt>
              <dd>{user.smsAlertsEnabled ? 'Enabled' : 'Disabled'}</dd>
            </div>
            <div>
              <dt>WhatsApp alerts</dt>
              <dd>{user.whatsappAlertsEnabled ? 'Enabled' : 'Disabled'}</dd>
            </div>
            <div>
              <dt>Marketing consent</dt>
              <dd>
                {user.marketingConsentAt ? formatDate(user.marketingConsentAt) : 'Not provided'}
              </dd>
            </div>
          </dl>
        </Card>
        <Card className="admin-record-card">
          <p className="hotel-page__eyebrow">Organization access</p>
          {user.organizationMemberships.length ? (
            user.organizationMemberships.map((membership) => (
              <div className="admin-record-item" key={membership.organization.id}>
                <Link
                  className="admin-directory-link"
                  href={`/admin/organizations/${membership.organization.id}`}
                >
                  {membership.organization.name}
                </Link>
                <span>
                  {membership.role} · {membership.organization.type}
                </span>
                <small>Joined {formatDate(membership.createdAt)}</small>
              </div>
            ))
          ) : (
            <p className="admin-empty-state">
              This is a personal account with no organization membership.
            </p>
          )}
        </Card>
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Travel history</p>
          <h2>Recent journeys</h2>
        </div>
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Product</th>
                  <th>Journey</th>
                  <th>Status</th>
                  <th>Value</th>
                  <th>Recorded</th>
                </tr>
              </thead>
              <tbody>
                {hotelBookings.map((booking) => (
                  <tr key={`hotel-${booking.confirmationCode}`}>
                    <td>
                      <strong>{booking.confirmationCode}</strong>
                    </td>
                    <td>
                      <strong>HOTEL</strong>
                      <span>{booking.hotelSlug}</span>
                    </td>
                    <td>
                      <strong>{booking.quote.checkInDate || 'Dates unavailable'}</strong>
                      {booking.quote.checkOutDate ? (
                        <span>to {booking.quote.checkOutDate}</span>
                      ) : null}
                    </td>
                    <td>
                      <strong>{booking.status}</strong>
                    </td>
                    <td>{formatCurrency(booking.totalAmount, booking.currency)}</td>
                    <td>{formatDate(booking.createdAt)}</td>
                  </tr>
                ))}
                {user.trips.map((trip) => (
                  <tr key={`trip-${trip.confirmationCode}`}>
                    <td>
                      <strong>{trip.confirmationCode}</strong>
                    </td>
                    <td>
                      <strong>{trip.productType}</strong>
                    </td>
                    <td>
                      <strong>{trip.title}</strong>
                      <span>{trip.startDate}</span>
                    </td>
                    <td>
                      <strong>{trip.status}</strong>
                    </td>
                    <td>{formatCurrency(trip.totalAmount, trip.currency)}</td>
                    <td>{formatDate(trip.createdAt)}</td>
                  </tr>
                ))}
                {hotelBookings.length + user.trips.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No travel records are connected to this account.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
        {hotelBookingCount + tripCount > hotelBookings.length + user.trips.length ? (
          <p className="booking-confirmation__note">
            Showing the latest {hotelBookings.length + user.trips.length} of{' '}
            {hotelBookingCount + tripCount} travel records.
          </p>
        ) : null}
      </div>

      <div className="admin-record-grid">
        <Card className="admin-record-card">
          <p className="hotel-page__eyebrow">Support history</p>
          {user.customerSupportCases.length ? (
            user.customerSupportCases.map((supportCase) => (
              <div className="admin-record-item" key={supportCase.caseNumber}>
                <strong>
                  {supportCase.caseNumber} · {supportCase.subject}
                </strong>
                <span>
                  {supportCase.category} · {supportCase.status}
                </span>
                <small>Updated {formatDate(supportCase.updatedAt)}</small>
              </div>
            ))
          ) : (
            <p className="admin-empty-state">
              No customer support cases are connected to this account.
            </p>
          )}
        </Card>
        <Card className="admin-record-card">
          <p className="hotel-page__eyebrow">Security activity</p>
          {user.securityEvents.length ? (
            user.securityEvents.map((event, index) => (
              <div className="admin-record-item" key={`${event.createdAt.toISOString()}-${index}`}>
                <strong>{event.summary}</strong>
                <span>{event.action.replaceAll('_', ' ')}</span>
                <small>{formatDate(event.createdAt)}</small>
              </div>
            ))
          ) : (
            <p className="admin-empty-state">No account security events have been recorded.</p>
          )}
        </Card>
      </div>
      {supportCaseCount > user.customerSupportCases.length ? (
        <p className="booking-confirmation__note">
          Showing the latest {user.customerSupportCases.length} of {supportCaseCount} support cases.
        </p>
      ) : null}
    </section>
  );
}
