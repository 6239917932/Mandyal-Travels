import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { BusinessTravelRequestForm } from '@/components/business/BusinessTravelRequestForm';
import { BusinessRequestCheckoutLink } from '@/components/business/BusinessRequestCheckoutLink';
import { getCurrentSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { customerTravelHistoryDocument } from '@/services/customerTravelHistoryRules';
import { getCustomerTravelHistoryDashboardTransport } from '@/services/customerTravelHistoryService';

export const metadata: Metadata = { title: 'My account' };

const RECENT_ITEM_LIMIT = 20;

const customerQuickActions = [
  { description: 'Find a stay for your next journey.', href: '/hotels', label: 'Book a hotel' },
  { description: 'Find self-drive and chauffeur options.', href: '/cars', label: 'Find a car' },
  {
    description: 'Open an existing booking with its reference.',
    href: '/manage-booking',
    label: 'Manage booking',
  },
  {
    description: 'Ask our team about a booking or your account.',
    href: '/account/support',
    label: 'Get help',
  },
] as const;

const customerAccountActions = [
  {
    description:
      'Update your name, password, two-step verification, sessions, and privacy choices.',
    href: '/account/settings',
    label: 'Profile and security',
  },
  {
    description: 'Choose how Mandyal Travels may contact you.',
    href: '/account/notifications',
    label: 'Communication preferences',
  },
  {
    description: 'Review the permissions recorded for your account.',
    href: '/account/consents',
    label: 'Privacy choices',
  },
  {
    description: 'Check the status of future rewards and referral benefits.',
    href: '/account/benefits',
    label: 'Rewards status',
  },
  {
    description: 'Save passenger details for a faster checkout.',
    href: '/account/travelers',
    label: 'Saved travelers',
  },
  {
    description: 'View payment records linked to your bookings.',
    href: '/account/payments',
    label: 'Payments',
  },
  {
    description: 'Open invoices, vouchers, and travel documents.',
    href: '/account/documents',
    label: 'Travel documents',
  },
  {
    description: 'Review current travel discounts and announcements.',
    href: '/offers',
    label: 'Offers',
  },
] as const;

function humanizeSlug(value: string) {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function isBusinessProduct(value: string): value is 'FLIGHT' | 'HOTEL' | 'BUS' | 'CAR' {
  return ['FLIGHT', 'HOTEL', 'BUS', 'CAR'].includes(value);
}

export default async function AccountPage() {
  const currentSession = await getCurrentSession();
  if (!currentSession) redirect('/login');
  const { user } = currentSession;

  const [
    dashboardTransport,
    hotelGuests,
    organizationMembership,
    hotelTripCount,
    confirmedHotelTripCount,
    hotelTripValue,
  ] = await Promise.all([
    getCustomerTravelHistoryDashboardTransport({
      sessionEmail: user.email,
      userId: user.id,
    }),
    prisma.bookingGuest.findMany({
      where: { email: user.email },
      include: { booking: { include: { quote: true } } },
      orderBy: { booking: { createdAt: 'desc' } },
      take: RECENT_ITEM_LIMIT,
    }),
    prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: { organization: true },
    }),
    prisma.bookingGuest.count({ where: { email: user.email } }),
    prisma.bookingGuest.count({
      where: { booking: { status: 'confirmed' }, email: user.email },
    }),
    prisma.booking.aggregate({
      _sum: { totalAmount: true },
      where: { currency: 'INR', guest: { is: { email: user.email } } },
    }),
  ]);

  const trips = [
    ...dashboardTransport.entries.map((trip) => ({
      id: trip.id,
      productType: trip.productType,
      confirmationCode: trip.confirmationCode,
      status: trip.status,
      title: trip.title,
      subtitle: trip.subtitle,
      startDate: trip.startDate,
      endDate: trip.endDate,
      totalAmount: trip.totalAmount,
      currency: trip.currency,
      detailsJson: trip.detailsJson,
      createdAt: trip.createdAt,
    })),
    ...hotelGuests.map(({ booking }) => ({
      id: booking.id,
      productType: 'HOTEL',
      confirmationCode: booking.confirmationCode,
      status: booking.status,
      title: humanizeSlug(booking.hotelSlug),
      subtitle: 'Hotel stay',
      startDate: booking.quote.checkInDate,
      endDate: booking.quote.checkOutDate,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      detailsJson: null,
      createdAt: booking.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, RECENT_ITEM_LIMIT);

  const totalTrips = dashboardTransport.count + hotelTripCount;
  const confirmedTrips = dashboardTransport.confirmedCount + confirmedHotelTripCount;
  const bookedValue = dashboardTransport.bookedValue + (hotelTripValue._sum.totalAmount ?? 0);
  const [businessTravelRequests, businessTravelRequestCount] = organizationMembership
    ? await Promise.all([
        prisma.businessTravelRequest.findMany({
          include: { customerTrip: true, hotelBooking: true },
          orderBy: { createdAt: 'desc' },
          take: RECENT_ITEM_LIMIT,
          where: {
            organizationId: organizationMembership.organizationId,
            requesterId: user.id,
          },
        }),
        prisma.businessTravelRequest.count({
          where: {
            organizationId: organizationMembership.organizationId,
            requesterId: user.id,
          },
        }),
      ])
    : [[], 0];

  return (
    <section className="account-page customer-account-page">
      <div className="auth-page__intro customer-account-page__intro">
        <p className="hotel-page__eyebrow">
          {user.role === 'PLATFORM_ADMIN'
            ? 'Platform administration'
            : user.role === 'BUSINESS_ADMIN'
              ? 'Personal travel profile'
              : 'My Mandyal account'}
        </p>
        <h1>Welcome back, {user.firstName}.</h1>
        <p>
          {user.role === 'PLATFORM_ADMIN'
            ? 'Use the secure administration workspace to manage the platform.'
            : 'Plan a journey, check a booking, or update your account from one place.'}
        </p>
        {user.role === 'PLATFORM_ADMIN' ? (
          <Link className="ui-button" href="/admin">
            Open administration workspace
          </Link>
        ) : null}
      </div>

      {user.role === 'CUSTOMER' ? (
        <section className="customer-dashboard" aria-labelledby="customer-actions-heading">
          <div className="account-trips__heading">
            <p className="hotel-page__eyebrow">Quick actions</p>
            <h2 id="customer-actions-heading">How can we help today?</h2>
          </div>
          <div className="customer-dashboard__actions">
            {customerQuickActions.map((action) => (
              <Link className="customer-dashboard__action" href={action.href} key={action.href}>
                <strong>{action.label}</strong>
                <span>{action.description}</span>
              </Link>
            ))}
          </div>
          <p className="customer-dashboard__availability" role="status">
            Hotels and cars are available first. Flights and buses are coming soon while live
            supplier connections are completed.
          </p>
        </section>
      ) : null}

      <section className="customer-account-overview" aria-labelledby="travel-summary-heading">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">At a glance</p>
          <h2 id="travel-summary-heading">Your travel summary</h2>
        </div>
        <dl className="customer-account-summary ui-card">
          <div>
            <dt>Total bookings</dt>
            <dd>{totalTrips}</dd>
          </div>
          <div>
            <dt>Confirmed journeys</dt>
            <dd>{confirmedTrips}</dd>
          </div>
          <div>
            <dt>Booked value</dt>
            <dd>{formatCurrency(bookedValue, 'INR')}</dd>
          </div>
        </dl>
      </section>

      <div className="account-card customer-account-card ui-card ui-card--padded">
        <div>
          <span>Name</span>
          <strong>
            {user.firstName} {user.lastName}
          </strong>
        </div>
        <div>
          <span>Email</span>
          <strong>{user.email}</strong>
        </div>
        <div>
          <span>Account type</span>
          <strong>
            {user.role === 'PLATFORM_ADMIN'
              ? 'Platform administrator'
              : user.role === 'BUSINESS_ADMIN'
                ? 'Business administrator'
                : 'Customer'}
          </strong>
        </div>
        {organizationMembership ? (
          <div>
            <span>Organization</span>
            <strong>{organizationMembership.organization.name}</strong>
          </div>
        ) : null}
        <div className="customer-account-card__actions">
          <Link className="ui-button ui-button--secondary" href="/account/settings">
            Account settings
          </Link>
          <form action="/api/v1/auth/logout" method="post">
            <button className="ui-button ui-button--secondary" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>

      {user.role === 'CUSTOMER' ? (
        <section
          className="customer-dashboard customer-dashboard--secondary"
          aria-labelledby="account-tools-heading"
        >
          <div className="account-trips__heading">
            <p className="hotel-page__eyebrow">Account</p>
            <h2 id="account-tools-heading">Details and preferences</h2>
          </div>
          <div className="customer-dashboard__actions customer-dashboard__actions--secondary">
            {customerAccountActions.map((action) => (
              <Link className="customer-dashboard__action" href={action.href} key={action.href}>
                <strong>{action.label}</strong>
                <span>{action.description}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {organizationMembership ? (
        <section
          className="account-trips"
          id="company-travel-request"
          aria-labelledby="company-travel-heading"
        >
          <div className="account-trips__heading">
            <p className="hotel-page__eyebrow">Company travel</p>
            <h2 id="company-travel-heading">Request an organization trip</h2>
            <Link href="/account/company-requests">View all company requests</Link>
          </div>
          <BusinessTravelRequestForm
            organizationName={organizationMembership.organization.name}
            policy={{
              approvalRequired: organizationMembership.organization.approvalRequired,
              defaultCabinClass: organizationMembership.organization.defaultCabinClass,
              maximumTripAmount: organizationMembership.organization.maximumTripAmount,
            }}
          />

          {businessTravelRequests.length > 0 ? (
            <>
              {businessTravelRequestCount > RECENT_ITEM_LIMIT ? (
                <p className="business-request__guidance">
                  Showing your latest {RECENT_ITEM_LIMIT} of {businessTravelRequestCount} company
                  requests. Open the full request history to browse older records.
                </p>
              ) : null}
              <div className="account-trips__list">
                {businessTravelRequests.map((request) => (
                  <article className="account-trip ui-card ui-card--padded" key={request.id}>
                    <div className="account-trip__topline">
                      <span className="account-trip__type">{request.productType}</span>
                      <strong
                        className={`business-request__status business-request__status--${request.status.toLowerCase()}`}
                      >
                        {request.status}
                      </strong>
                    </div>
                    <div className="account-trip__body">
                      <div>
                        <h3>{request.title}</h3>
                        <p>{request.policyReason}</p>
                        {request.reviewNote ? (
                          <small>Administrator note: {request.reviewNote}</small>
                        ) : null}
                      </div>
                      <dl>
                        <div>
                          <dt>Travel dates</dt>
                          <dd>
                            {request.startDate}
                            {request.endDate ? ` to ${request.endDate}` : ''}
                          </dd>
                        </div>
                        <div>
                          <dt>Estimated amount</dt>
                          <dd>{formatCurrency(request.estimatedAmount, request.currency)}</dd>
                        </div>
                        {request.bookingTotalAmount !== null ? (
                          <div>
                            <dt>Booked amount</dt>
                            <dd>{formatCurrency(request.bookingTotalAmount, request.currency)}</dd>
                          </div>
                        ) : null}
                        {request.customerTrip || request.hotelBooking ? (
                          <div>
                            <dt>Booking reference</dt>
                            <dd>
                              {request.customerTrip?.confirmationCode ??
                                request.hotelBooking?.confirmationCode}
                            </dd>
                          </div>
                        ) : null}
                        <div>
                          <dt>Organization</dt>
                          <dd>{organizationMembership.organization.name}</dd>
                        </div>
                      </dl>
                    </div>
                    {request.status === 'APPROVED' && isBusinessProduct(request.productType) ? (
                      <div className="account-trip__actions">
                        <BusinessRequestCheckoutLink
                          id={request.id}
                          organizationName={organizationMembership.organization.name}
                          productType={request.productType}
                          title={request.title}
                        />
                        <Link
                          className="ui-button ui-button--secondary"
                          href={`/business/requests/${request.id}`}
                        >
                          View request record
                        </Link>
                      </div>
                    ) : (
                      <div className="account-trip__actions">
                        <Link
                          className="ui-button ui-button--secondary"
                          href={`/business/requests/${request.id}`}
                        >
                          View request record
                        </Link>
                      </div>
                    )}
                    {request.status === 'PENDING' ? (
                      <p className="business-request__guidance">
                        Payment remains unavailable until an administrator approves this request.
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="account-trips__empty ui-card ui-card--padded">
              <strong>No company requests yet.</strong>
              <p>Your submitted requests and approval status will appear here.</p>
            </div>
          )}
        </section>
      ) : null}

      <div className="account-trips" id="my-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Your journeys</p>
          <h2>My trips</h2>
          <Link href="/account/trips">View complete travel history</Link>
        </div>

        {trips.length === 0 ? (
          <div className="account-trips__empty ui-card ui-card--padded">
            <strong>No trips yet.</strong>
            <p>Your signed-in bookings will appear here automatically.</p>
          </div>
        ) : (
          <>
            {totalTrips > RECENT_ITEM_LIMIT ? (
              <div className="business-request__guidance">
                Showing your latest {RECENT_ITEM_LIMIT} of {totalTrips} bookings. Open the complete
                travel history to browse older journeys.
              </div>
            ) : null}
            <div className="account-trips__list">
              {trips.map((trip) => {
                const documentAction = customerTravelHistoryDocument(
                  trip.productType,
                  trip.confirmationCode,
                  trip.detailsJson,
                );

                return (
                  <article
                    className="account-trip ui-card ui-card--padded"
                    key={`${trip.productType}-${trip.id}`}
                  >
                    <div className="account-trip__topline">
                      <span className="account-trip__type">{trip.productType}</span>
                      <strong>{trip.status}</strong>
                    </div>
                    <div className="account-trip__body">
                      <div>
                        <h3>{trip.title}</h3>
                        <p>{trip.subtitle}</p>
                      </div>
                      <dl>
                        <div>
                          <dt>Travel dates</dt>
                          <dd>
                            {trip.startDate}
                            {trip.endDate ? ` to ${trip.endDate}` : ''}
                          </dd>
                        </div>
                        <div>
                          <dt>Booking reference</dt>
                          <dd>{trip.confirmationCode}</dd>
                        </div>
                        <div>
                          <dt>Total</dt>
                          <dd>{formatCurrency(trip.totalAmount, trip.currency)}</dd>
                        </div>
                      </dl>
                    </div>
                    {documentAction ? (
                      <div className="account-trip__actions">
                        <Link className="ui-button ui-button--secondary" href={documentAction.href}>
                          {documentAction.label}
                        </Link>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
