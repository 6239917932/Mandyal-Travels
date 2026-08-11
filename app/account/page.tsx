import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { NotificationPreferences } from '@/components/account/NotificationPreferences';
import { BusinessTravelRequestForm } from '@/components/business/BusinessTravelRequestForm';
import { BusinessRequestCheckoutLink } from '@/components/business/BusinessRequestCheckoutLink';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'My account' };

const customerQuickActions = [
  { description: 'Find and reserve your next stay.', href: '/hotels', label: 'Hotels' },
  { description: 'Compare fares and book a flight.', href: '/flights', label: 'Flights' },
  { description: 'Choose routes, operators, and seats.', href: '/buses', label: 'Buses' },
  { description: 'Reserve self-drive and chauffeur cars.', href: '/cars', label: 'Cars' },
  {
    description: 'Open, amend, or cancel an existing stay.',
    href: '/manage-booking',
    label: 'Manage booking',
  },
  { description: 'View current travel discounts.', href: '/offers', label: 'Offers' },
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

function getTripDocumentAction(trip: {
  productType: string;
  confirmationCode: string;
  detailsJson: string | null;
}) {
  if (trip.productType === 'HOTEL') {
    return {
      href: `/manage-booking/${trip.confirmationCode}/voucher`,
      label: 'View voucher',
    };
  }

  if (!trip.detailsJson) return null;

  try {
    const details = JSON.parse(trip.detailsJson) as { documentQuery?: string };
    if (!details.documentQuery) return null;

    const routes: Record<string, { path: string; label: string }> = {
      FLIGHT: {
        path: `/flights/booking/${trip.confirmationCode}/itinerary`,
        label: 'View itinerary',
      },
      BUS: {
        path: `/buses/booking/${trip.confirmationCode}/ticket`,
        label: 'View ticket',
      },
      CAR: {
        path: `/cars/booking/${trip.confirmationCode}/voucher`,
        label: 'View voucher',
      },
    };
    const route = routes[trip.productType];

    return route ? { href: `${route.path}?${details.documentQuery}`, label: route.label } : null;
  } catch {
    return null;
  }
}

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [storedTrips, hotelGuests, organizationMembership] = await Promise.all([
    prisma.customerTrip.findMany({
      where: { OR: [{ userId: user.id }, { email: user.email }] },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.bookingGuest.findMany({
      where: { email: user.email },
      include: { booking: { include: { quote: true } } },
    }),
    prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: { organization: true },
    }),
  ]);

  const trips = [
    ...storedTrips.map((trip) => ({
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
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const confirmedTrips = trips.filter((trip) => trip.status.toUpperCase() === 'CONFIRMED').length;
  const bookedValue = trips
    .filter((trip) => trip.currency === 'INR')
    .reduce((total, trip) => total + trip.totalAmount, 0);
  const businessTravelRequests = organizationMembership
    ? await prisma.businessTravelRequest.findMany({
        include: { customerTrip: true, hotelBooking: true },
        orderBy: { createdAt: 'desc' },
        where: {
          organizationId: organizationMembership.organizationId,
          requesterId: user.id,
        },
      })
    : [];

  return (
    <section className="account-page">
      <div className="auth-page__intro">
        <p className="hotel-page__eyebrow">
          {user.role === 'BUSINESS_ADMIN' ? 'Personal travel profile' : 'Customer workspace'}
        </p>
        <h1>Welcome back, {user.firstName}.</h1>
        <p>
          Your {user.role === 'BUSINESS_ADMIN' ? 'business' : 'customer'} account is active and
          protected by a secure browser session.
        </p>
      </div>

      {user.role === 'CUSTOMER' ? (
        <section className="customer-dashboard" aria-labelledby="customer-actions-heading">
          <div className="account-trips__heading">
            <p className="hotel-page__eyebrow">Plan and manage</p>
            <h2 id="customer-actions-heading">What would you like to do?</h2>
          </div>
          <div className="customer-dashboard__actions">
            {customerQuickActions.map((action) => (
              <Link className="customer-dashboard__action" href={action.href} key={action.href}>
                <strong>{action.label}</strong>
                <span>{action.description}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="account-card ui-card ui-card--padded">
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
          <strong>{user.role === 'BUSINESS_ADMIN' ? 'Business administrator' : 'Customer'}</strong>
        </div>
        {organizationMembership ? (
          <div>
            <span>Organization</span>
            <strong>{organizationMembership.organization.name}</strong>
          </div>
        ) : null}
        <form action="/api/v1/auth/logout" method="post">
          <button className="ui-button ui-button--secondary" type="submit">
            Sign out
          </button>
        </form>
      </div>

      {organizationMembership ? (
        <section
          className="account-trips"
          id="company-travel-request"
          aria-labelledby="company-travel-heading"
        >
          <div className="account-trips__heading">
            <p className="hotel-page__eyebrow">Company travel</p>
            <h2 id="company-travel-heading">Request an organization trip</h2>
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
          ) : (
            <div className="account-trips__empty ui-card ui-card--padded">
              <strong>No company requests yet.</strong>
              <p>Your submitted requests and approval status will appear here.</p>
            </div>
          )}
        </section>
      ) : null}

      <section className="account-trips" aria-labelledby="travel-summary-heading">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Account reporting</p>
          <h2 id="travel-summary-heading">Travel summary</h2>
        </div>
        <div className="account-trip ui-card ui-card--padded">
          <dl>
            <div>
              <dt>Total bookings</dt>
              <dd>{trips.length}</dd>
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
          <p>Summary values are calculated from bookings connected to this customer account.</p>
        </div>
      </section>

      <NotificationPreferences email={user.email} />

      <div className="account-trips" id="my-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Your journeys</p>
          <h2>My trips</h2>
        </div>

        {trips.length === 0 ? (
          <div className="account-trips__empty ui-card ui-card--padded">
            <strong>No trips yet.</strong>
            <p>Your signed-in bookings will appear here automatically.</p>
          </div>
        ) : (
          <div className="account-trips__list">
            {trips.map((trip) => {
              const documentAction = getTripDocumentAction(trip);

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
        )}
      </div>
    </section>
  );
}
