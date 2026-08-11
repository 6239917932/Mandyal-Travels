import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AdminSupportAction } from '@/components/admin/AdminSupportAction';
import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Operations console' };

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
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

function statusClass(status: string) {
  return `business-request__status business-request__status--${status.toLowerCase()}`;
}

export default async function AdminPage() {
  const administrator = await getPlatformAdmin();
  if (!administrator) redirect('/login?returnTo=/admin');

  const now = new Date();
  const [
    userCount,
    organizationCount,
    activeSessionCount,
    hotelBookingCount,
    customerTripCount,
    pendingRequestCount,
    openSupportCount,
    pendingAmendmentCount,
    hotelValue,
    tripValue,
    pendingRequests,
    recentSupportCases,
    pendingAmendments,
    recentHotelBookings,
    recentTrips,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.userSession.count({ where: { expiresAt: { gt: now } } }),
    prisma.booking.count(),
    prisma.customerTrip.count(),
    prisma.businessTravelRequest.count({ where: { status: 'PENDING' } }),
    prisma.businessSupportCase.count({ where: { status: 'OPEN' } }),
    prisma.bookingAmendment.count({ where: { status: 'pending' } }),
    prisma.booking.aggregate({
      _sum: { totalAmount: true },
      where: { currency: 'INR', status: 'confirmed' },
    }),
    prisma.customerTrip.aggregate({
      _sum: { totalAmount: true },
      where: { currency: 'INR', status: 'CONFIRMED' },
    }),
    prisma.businessTravelRequest.findMany({
      include: {
        organization: { select: { name: true } },
        requester: { select: { email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 12,
      where: { status: 'PENDING' },
    }),
    prisma.businessSupportCase.findMany({
      include: {
        createdBy: { select: { email: true, firstName: true, lastName: true } },
        organization: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 12,
    }),
    prisma.bookingAmendment.findMany({
      include: {
        booking: {
          include: { guest: { select: { email: true, firstName: true, lastName: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 12,
      where: { status: 'pending' },
    }),
    prisma.booking.findMany({
      include: {
        guest: { select: { email: true, firstName: true, lastName: true } },
        quote: { select: { checkInDate: true, checkOutDate: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.customerTrip.findMany({
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);
  const recordedValue = (hotelValue._sum.totalAmount ?? 0) + (tripValue._sum.totalAmount ?? 0);

  return (
    <section className="account-page platform-admin-page">
      <div className="auth-page__intro">
        <p className="hotel-page__eyebrow">Mandyal operations</p>
        <h1>Operations console</h1>
        <p>
          Read-only platform oversight for {administrator.firstName}. Organization administrators
          retain control of company approvals and policies.
        </p>
        <form action="/api/v1/auth/logout" method="post">
          <button className="ui-button ui-button--secondary" type="submit">
            Sign out
          </button>
        </form>
      </div>

      <Card className="admin-export-form">
        <div>
          <strong>Operational travel export</strong>
          <span>Download hotel, flight, bus, and car records for a selected period.</span>
        </div>
        <form action="/api/v1/admin/reports/export" method="get">
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="admin-export-from">
              From date
            </label>
            <input className="ui-input" id="admin-export-from" name="from" type="date" />
          </div>
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="admin-export-to">
              To date
            </label>
            <input className="ui-input" id="admin-export-to" name="to" type="date" />
          </div>
          <button className="ui-button ui-button--primary" type="submit">
            Export travel CSV
          </button>
        </form>
      </Card>

      <div className="partner-bookings__summary">
        <Card>
          <span>Customer accounts</span>
          <strong>{userCount}</strong>
        </Card>
        <Card>
          <span>Organizations</span>
          <strong>{organizationCount}</strong>
        </Card>
        <Card>
          <span>Active sessions</span>
          <strong>{activeSessionCount}</strong>
        </Card>
        <Card>
          <span>Travel records</span>
          <strong>{hotelBookingCount + customerTripCount}</strong>
        </Card>
        <Card>
          <span>Recorded confirmed value</span>
          <strong>{formatCurrency(recordedValue)}</strong>
        </Card>
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Operational queues</p>
          <h2>Items needing attention</h2>
        </div>
        <div className="partner-bookings__summary">
          <Card>
            <span>Company approvals</span>
            <strong>{pendingRequestCount}</strong>
          </Card>
          <Card>
            <span>Open company support</span>
            <strong>{openSupportCount}</strong>
          </Card>
          <Card>
            <span>Hotel amendments</span>
            <strong>{pendingAmendmentCount}</strong>
          </Card>
        </div>
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Company approvals</p>
          <h2>Pending travel requests</h2>
        </div>
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Traveller</th>
                  <th>Journey</th>
                  <th>Policy state</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <strong>{request.organization.name}</strong>
                    </td>
                    <td>
                      <strong>
                        {request.requester.firstName} {request.requester.lastName}
                      </strong>
                      <span>{request.requester.email}</span>
                    </td>
                    <td>
                      <strong>{request.title}</strong>
                      <span>
                        {request.productType} · {formatCurrency(request.estimatedAmount)}
                      </span>
                    </td>
                    <td>
                      <strong className={statusClass(request.status)}>{request.status}</strong>
                      <span>{request.policyReason}</span>
                    </td>
                    <td>
                      <time dateTime={request.createdAt.toISOString()}>
                        {formatDate(request.createdAt)}
                      </time>
                    </td>
                  </tr>
                ))}
                {pendingRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No company approvals are waiting.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
        {pendingRequestCount > pendingRequests.length ? (
          <p className="booking-confirmation__note">
            Showing the 12 oldest requests. Organization administrators review and decide these
            requests in their own workspace.
          </p>
        ) : null}
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Account servicing</p>
          <h2>Recent company support cases</h2>
        </div>
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Organization</th>
                  <th>Created by</th>
                  <th>Subject</th>
                  <th>Status and action</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {recentSupportCases.map((supportCase) => (
                  <tr key={supportCase.id}>
                    <td>
                      <strong>{supportCase.caseNumber}</strong>
                      <span>{supportCase.category}</span>
                    </td>
                    <td>
                      <strong>{supportCase.organization.name}</strong>
                    </td>
                    <td>
                      <strong>
                        {supportCase.createdBy.firstName} {supportCase.createdBy.lastName}
                      </strong>
                      <span>{supportCase.createdBy.email}</span>
                    </td>
                    <td>
                      <strong>{supportCase.subject}</strong>
                      <span>{supportCase.bookingReference ?? 'No booking reference'}</span>
                    </td>
                    <td>
                      <strong className={statusClass(supportCase.status)}>
                        {supportCase.status}
                      </strong>
                      <AdminSupportAction caseId={supportCase.id} status={supportCase.status} />
                    </td>
                    <td>
                      <time dateTime={supportCase.updatedAt.toISOString()}>
                        {formatDate(supportCase.updatedAt)}
                      </time>
                    </td>
                  </tr>
                ))}
                {recentSupportCases.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No company support cases have been created.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Partner operations</p>
          <h2>Pending hotel amendments</h2>
        </div>
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Guest</th>
                  <th>Requested stay</th>
                  <th>Reason</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {pendingAmendments.map((amendment) => (
                  <tr key={amendment.id}>
                    <td>
                      <strong>{amendment.booking.confirmationCode}</strong>
                      <span>{amendment.booking.hotelSlug}</span>
                    </td>
                    <td>
                      <strong>
                        {amendment.booking.guest
                          ? `${amendment.booking.guest.firstName} ${amendment.booking.guest.lastName}`
                          : 'Guest unavailable'}
                      </strong>
                      <span>{amendment.booking.guest?.email ?? '—'}</span>
                    </td>
                    <td>
                      <strong>{amendment.requestedCheckInDate}</strong>
                      <span>to {amendment.requestedCheckOutDate}</span>
                    </td>
                    <td>{amendment.reason}</td>
                    <td>
                      <time dateTime={amendment.createdAt.toISOString()}>
                        {formatDate(amendment.createdAt)}
                      </time>
                    </td>
                  </tr>
                ))}
                {pendingAmendments.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No hotel amendments are waiting for partner review.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Recent activity</p>
          <h2>Latest confirmed and changed journeys</h2>
        </div>
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Product</th>
                  <th>Customer</th>
                  <th>Travel</th>
                  <th>Status</th>
                  <th>Recorded</th>
                </tr>
              </thead>
              <tbody>
                {recentHotelBookings.map((booking) => (
                  <tr key={`hotel-${booking.id}`}>
                    <td>
                      <strong>{booking.confirmationCode}</strong>
                    </td>
                    <td>
                      <strong>HOTEL</strong>
                      <span>{booking.hotelSlug}</span>
                    </td>
                    <td>
                      <strong>
                        {booking.guest
                          ? `${booking.guest.firstName} ${booking.guest.lastName}`
                          : 'Guest unavailable'}
                      </strong>
                      <span>{booking.guest?.email ?? '—'}</span>
                    </td>
                    <td>
                      <strong>{booking.quote.checkInDate}</strong>
                      <span>to {booking.quote.checkOutDate}</span>
                    </td>
                    <td>
                      <strong className={statusClass(booking.status)}>{booking.status}</strong>
                    </td>
                    <td>
                      <time dateTime={booking.createdAt.toISOString()}>
                        {formatDate(booking.createdAt)}
                      </time>
                    </td>
                  </tr>
                ))}
                {recentTrips.map((trip) => (
                  <tr key={`trip-${trip.id}`}>
                    <td>
                      <strong>{trip.confirmationCode}</strong>
                    </td>
                    <td>
                      <strong>{trip.productType}</strong>
                      <span>{trip.title}</span>
                    </td>
                    <td>{trip.user?.email ?? trip.email}</td>
                    <td>
                      <strong>{trip.startDate}</strong>
                      <span>{trip.endDate ? `to ${trip.endDate}` : trip.subtitle}</span>
                    </td>
                    <td>
                      <strong className={statusClass(trip.status)}>{trip.status}</strong>
                    </td>
                    <td>
                      <time dateTime={trip.createdAt.toISOString()}>
                        {formatDate(trip.createdAt)}
                      </time>
                    </td>
                  </tr>
                ))}
                {recentHotelBookings.length + recentTrips.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No travel activity has been recorded.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </section>
  );
}
