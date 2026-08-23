import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminCustomerSupportAction } from '@/components/admin/AdminCustomerSupportAction';
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

function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
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
    openCompanySupportCount,
    openCustomerSupportCount,
    pendingAmendmentCount,
    hotelValue,
    tripValue,
    pendingRequests,
    recentSupportCases,
    recentCustomerSupportCases,
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
    prisma.customerSupportCase.count({ where: { status: 'OPEN' } }),
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
        organization: { select: { id: true, name: true } },
        requester: { select: { email: true, firstName: true, id: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 12,
      where: { status: 'PENDING' },
    }),
    prisma.businessSupportCase.findMany({
      include: {
        createdBy: { select: { email: true, firstName: true, id: true, lastName: true } },
        organization: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 12,
    }),
    prisma.customerSupportCase.findMany({
      include: {
        createdBy: { select: { email: true, firstName: true, id: true, lastName: true } },
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
      include: { user: { select: { email: true, firstName: true, id: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);
  const recordedValue = (hotelValue._sum.totalAmount ?? 0) + (tripValue._sum.totalAmount ?? 0);
  const attentionCount =
    pendingRequestCount +
    openCompanySupportCount +
    openCustomerSupportCount +
    pendingAmendmentCount;
  const snapshotLabel = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(now);
  const exportFrom = new Date(now);
  exportFrom.setUTCDate(exportFrom.getUTCDate() - 30);
  const exportFromValue = formatDateInput(exportFrom);
  const exportToValue = formatDateInput(now);

  return (
    <section className="account-page platform-admin-page">
      <header className="admin-hero" id="overview">
        <div className="admin-hero__content">
          <p className="admin-hero__eyebrow">Secure platform administration</p>
          <h1>Operations control center</h1>
          <p>
            Welcome, {administrator.firstName}. Monitor platform activity, service accounts, and
            coordinate operational queues from one protected workspace.
          </p>
          <div className="admin-hero__actions">
            <Link className="ui-button ui-button--primary" href="/admin/users">
              Find a customer
            </Link>
            <Link className="ui-button ui-button--secondary" href="/admin/organizations">
              Find an organization
            </Link>
            <Link className="ui-button ui-button--secondary" href="/admin/partners">
              Manage suppliers
            </Link>
            <Link className="ui-button ui-button--secondary" href="/admin/reviews">
              Moderate hotel reviews
            </Link>
            <Link className="ui-button ui-button--secondary" href="/admin/finance">
              Finance operations
            </Link>
            <Link className="ui-button ui-button--secondary" href="/admin/settlements">
              Partner settlements
            </Link>
            <Link className="ui-button ui-button--secondary" href="/admin/analytics">
              Platform analytics
            </Link>
            <Link className="ui-button ui-button--secondary" href="/admin/bookings">
              Booking operations
            </Link>
            <Link className="ui-button ui-button--secondary" href="/admin/notifications">
              Notifications
            </Link>
            <Link className="ui-button ui-button--secondary" href="/admin/promotions">
              Promotions and coupons
            </Link>
            <Link className="ui-button ui-button--secondary" href="/admin/operations">
              Exception queues
            </Link>
            <Link className="ui-button ui-button--secondary" href="/admin/support">
              Support operations
            </Link>
            <Link className="ui-button ui-button--secondary" href="/admin/configuration">
              Platform configuration
            </Link>
            <form action="/api/v1/auth/logout" method="post">
              <button className="admin-hero__signout" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <div className="admin-hero__posture">
          <span className="admin-hero__secure">Platform administrator</span>
          <strong>
            {attentionCount === 0
              ? 'Operations are clear'
              : `${attentionCount} items need attention`}
          </strong>
          <span>Live snapshot: {snapshotLabel}</span>
          <span>Public administrator registration is disabled.</span>
        </div>
      </header>

      <nav aria-label="Operations console sections" className="admin-section-nav">
        <a href="#overview">Overview</a>
        <a href="#directories">Directories</a>
        <a href="#queues">Queues</a>
        <a href="#reporting">Reporting</a>
        <a href="#recent-activity">Recent activity</a>
      </nav>

      <div className="admin-overview-grid">
        <Card className="admin-metric admin-metric--primary">
          <span>Recorded confirmed value</span>
          <strong>{formatCurrency(recordedValue)}</strong>
          <small>Confirmed hotel, flight, bus, and car records</small>
        </Card>
        <Card className="admin-metric">
          <span>Platform accounts</span>
          <strong>{userCount.toLocaleString('en-IN')}</strong>
          <small>{activeSessionCount} currently active sessions</small>
        </Card>
        <Card className="admin-metric">
          <span>Organizations</span>
          <strong>{organizationCount.toLocaleString('en-IN')}</strong>
          <small>Corporate workspaces under servicing</small>
        </Card>
        <Card className="admin-metric">
          <span>Travel records</span>
          <strong>{(hotelBookingCount + customerTripCount).toLocaleString('en-IN')}</strong>
          <small>Across all supported travel products</small>
        </Card>
        <Card
          className={
            attentionCount > 0
              ? 'admin-metric admin-metric--attention'
              : 'admin-metric admin-metric--clear'
          }
        >
          <span>Open operational work</span>
          <strong>{attentionCount.toLocaleString('en-IN')}</strong>
          <small>
            {attentionCount > 0 ? 'Review the queues below' : 'No queued items at this snapshot'}
          </small>
        </Card>
      </div>

      <div className="admin-control-grid" aria-label="Administrative control posture">
        <Card>
          <span>Access boundary</span>
          <strong>Role protected</strong>
          <small>Every console page and administrative mutation requires platform access.</small>
        </Card>
        <Card>
          <span>Administrator enrollment</span>
          <strong>Private provisioning</strong>
          <small>Public registration cannot create a platform administrator.</small>
        </Card>
        <Card>
          <span>Operational exports</span>
          <strong>Bounded and private</strong>
          <small>Downloads are authenticated, date-scoped, and excluded from shared caches.</small>
        </Card>
        <Card>
          <span>Servicing accountability</span>
          <strong>Activity recorded</strong>
          <small>Support decisions and organization actions retain an operator history.</small>
        </Card>
      </div>

      <div className="account-trips" id="directories">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Account servicing</p>
          <h2>Platform directories</h2>
          <p>Search authorized account and organization records without direct database access.</p>
        </div>
        <div className="partner-bookings__summary">
          <Card>
            <span>User accounts</span>
            <strong>{userCount}</strong>
            <Link className="ui-button ui-button--secondary" href="/admin/users">
              Open user directory
            </Link>
          </Card>
          <Card>
            <span>Business organizations</span>
            <strong>{organizationCount}</strong>
            <Link className="ui-button ui-button--secondary" href="/admin/organizations">
              Open organization directory
            </Link>
          </Card>
        </div>
      </div>

      <div className="account-trips" id="queues">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Operational queues</p>
          <h2>Items needing attention</h2>
        </div>
        <div className="partner-bookings__summary">
          <Card>
            <span>Company approvals</span>
            <strong>{pendingRequestCount}</strong>
            <a href="#company-approvals">Review queue</a>
          </Card>
          <Card>
            <span>Open company support</span>
            <strong>{openCompanySupportCount}</strong>
            <Link href="/admin/support?type=BUSINESS&status=OPEN">Review full queue</Link>
          </Card>
          <Card>
            <span>Open customer support</span>
            <strong>{openCustomerSupportCount}</strong>
            <Link href="/admin/support?type=CUSTOMER&status=OPEN">Review full queue</Link>
          </Card>
          <Card>
            <span>Hotel amendments</span>
            <strong>{pendingAmendmentCount}</strong>
            <a href="#hotel-amendments">Review queue</a>
          </Card>
        </div>
      </div>

      <Card className="admin-export-form" id="reporting">
        <div>
          <p className="hotel-page__eyebrow">Reporting</p>
          <strong>Operational travel export</strong>
          <span>
            Download a bounded CSV of hotel, flight, bus, and car records for a selected period.
          </span>
        </div>
        <form action="/api/v1/admin/reports/export" method="get">
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="admin-export-from">
              From date
            </label>
            <input
              className="ui-input"
              defaultValue={exportFromValue}
              id="admin-export-from"
              max={exportToValue}
              name="from"
              type="date"
            />
          </div>
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="admin-export-to">
              To date
            </label>
            <input
              className="ui-input"
              defaultValue={exportToValue}
              id="admin-export-to"
              max={exportToValue}
              name="to"
              type="date"
            />
          </div>
          <button className="ui-button ui-button--primary" type="submit">
            Export travel CSV
          </button>
        </form>
      </Card>

      <div className="account-trips" id="customer-support">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Customer servicing</p>
          <h2>Recent customer support cases</h2>
        </div>
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Customer</th>
                  <th>Subject</th>
                  <th>Message</th>
                  <th>Status and action</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {recentCustomerSupportCases.map((supportCase) => (
                  <tr key={supportCase.id}>
                    <td>
                      <strong>{supportCase.caseNumber}</strong>
                      <span>{supportCase.category}</span>
                    </td>
                    <td>
                      <Link href={`/admin/users/${supportCase.createdBy.id}`}>
                        <strong>
                          {supportCase.createdBy.firstName} {supportCase.createdBy.lastName}
                        </strong>
                      </Link>
                      <span>{supportCase.createdBy.email}</span>
                    </td>
                    <td>
                      <strong>{supportCase.subject}</strong>
                      <span>{supportCase.bookingReference ?? 'No booking reference'}</span>
                    </td>
                    <td>
                      <span>
                        {supportCase.message.length > 180
                          ? `${supportCase.message.slice(0, 180)}…`
                          : supportCase.message}
                      </span>
                      {supportCase.resolutionNote ? (
                        <span>Resolution: {supportCase.resolutionNote}</span>
                      ) : null}
                    </td>
                    <td>
                      <strong className={statusClass(supportCase.status)}>
                        {supportCase.status}
                      </strong>
                      <AdminCustomerSupportAction
                        caseId={supportCase.id}
                        status={supportCase.status}
                      />
                    </td>
                    <td>
                      <time dateTime={supportCase.updatedAt.toISOString()}>
                        {formatDate(supportCase.updatedAt)}
                      </time>
                    </td>
                  </tr>
                ))}
                {recentCustomerSupportCases.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No customer support cases have been created.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="account-trips" id="company-approvals">
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
                      <Link href={`/admin/organizations/${request.organization.id}`}>
                        <strong>{request.organization.name}</strong>
                      </Link>
                    </td>
                    <td>
                      <Link href={`/admin/users/${request.requester.id}`}>
                        <strong>
                          {request.requester.firstName} {request.requester.lastName}
                        </strong>
                      </Link>
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

      <div className="account-trips" id="company-support">
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
                      <Link href={`/admin/organizations/${supportCase.organization.id}`}>
                        <strong>{supportCase.organization.name}</strong>
                      </Link>
                    </td>
                    <td>
                      <Link href={`/admin/users/${supportCase.createdBy.id}`}>
                        <strong>
                          {supportCase.createdBy.firstName} {supportCase.createdBy.lastName}
                        </strong>
                      </Link>
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

      <div className="account-trips" id="hotel-amendments">
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

      <div className="account-trips" id="recent-activity">
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
                      {booking.quote.checkInDate && booking.quote.checkOutDate ? (
                        <>
                          <strong>{booking.quote.checkInDate}</strong>
                          <span>to {booking.quote.checkOutDate}</span>
                        </>
                      ) : (
                        <span>Dates unavailable for this older record</span>
                      )}
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
                    <td>
                      {trip.user ? (
                        <Link href={`/admin/users/${trip.user.id}`}>
                          <strong>
                            {trip.user.firstName} {trip.user.lastName}
                          </strong>
                          <span>{trip.user.email}</span>
                        </Link>
                      ) : (
                        trip.email
                      )}
                    </td>
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
