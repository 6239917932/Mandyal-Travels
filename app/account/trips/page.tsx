import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { customerTripServicingPath } from '@/services/customerTripServicingService';

export const metadata: Metadata = { title: 'My travel history' };

const PAGE_SIZE = 25;

type TravelHistoryPageProps = {
  searchParams: Promise<{
    hotelPage?: string | string[];
    tripPage?: string | string[];
  }>;
};

function readPage(value: string | string[] | undefined) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

function humanizeSlug(value: string) {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function tripDocumentAction(trip: {
  confirmationCode: string;
  detailsJson: string;
  productType: string;
}) {
  try {
    const details = JSON.parse(trip.detailsJson) as { documentQuery?: string };
    if (!details.documentQuery) return null;
    const documents: Record<string, { label: string; path: string }> = {
      BUS: {
        label: 'View ticket',
        path: `/buses/booking/${trip.confirmationCode}/ticket`,
      },
      CAR: {
        label: 'View voucher',
        path: `/cars/booking/${trip.confirmationCode}/voucher`,
      },
      FLIGHT: {
        label: 'View itinerary',
        path: `/flights/booking/${trip.confirmationCode}/itinerary`,
      },
    };
    const document = documents[trip.productType];
    return document
      ? { href: `${document.path}?${details.documentQuery}`, label: document.label }
      : null;
  } catch {
    return null;
  }
}

function pageHref(tripPage: number, hotelPage: number) {
  return `/account/trips?tripPage=${tripPage}&hotelPage=${hotelPage}`;
}

export default async function TravelHistoryPage({ searchParams }: TravelHistoryPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=%2Faccount%2Ftrips');

  const values = await searchParams;
  const tripFilter = { OR: [{ userId: user.id }, { email: user.email }] };
  const [tripCount, hotelCount] = await Promise.all([
    prisma.customerTrip.count({ where: tripFilter }),
    prisma.bookingGuest.count({ where: { email: user.email } }),
  ]);
  const tripPages = Math.max(1, Math.ceil(tripCount / PAGE_SIZE));
  const hotelPages = Math.max(1, Math.ceil(hotelCount / PAGE_SIZE));
  const tripPage = Math.min(readPage(values.tripPage), tripPages);
  const hotelPage = Math.min(readPage(values.hotelPage), hotelPages);
  const [trips, hotelGuests] = await Promise.all([
    prisma.customerTrip.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (tripPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      where: tripFilter,
    }),
    prisma.bookingGuest.findMany({
      include: { booking: { include: { quote: true } } },
      orderBy: { booking: { createdAt: 'desc' } },
      skip: (hotelPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      where: { email: user.email },
    }),
  ]);

  return (
    <section className="account-page">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Your journeys</p>
          <h1>Complete travel history</h1>
          <p>All bookings connected to {user.email}.</p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/account#my-trips">
          Back to my account
        </Link>
      </div>

      <div className="partner-bookings__summary">
        <Card>
          <span>Flight, bus, and car bookings</span>
          <strong>{tripCount}</strong>
        </Card>
        <Card>
          <span>Hotel bookings</span>
          <strong>{hotelCount}</strong>
        </Card>
        <Card>
          <span>Total journeys</span>
          <strong>{tripCount + hotelCount}</strong>
        </Card>
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Transport and rentals</p>
          <h2>Flights, buses, and cars</h2>
        </div>
        {trips.length === 0 ? (
          <Card className="account-trips__empty">
            <strong>No flight, bus, or car bookings yet.</strong>
          </Card>
        ) : (
          <div className="account-trips__list">
            {trips.map((trip) => {
              const document = tripDocumentAction(trip);
              return (
                <Card className="account-trip" key={trip.id}>
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
                  <div className="account-trip__actions">
                    {document ? (
                      <Link className="ui-button ui-button--secondary" href={document.href}>
                        {document.label}
                      </Link>
                    ) : null}
                    <Link
                      className="ui-button ui-button--secondary"
                      href={customerTripServicingPath(trip)}
                    >
                      Request servicing
                    </Link>
                  </div>
                  <p className="booking-confirmation__fine-print">
                    Requests are reviewed by operations and do not automatically change or cancel a
                    booking or guarantee a refund.
                  </p>
                </Card>
              );
            })}
          </div>
        )}
        {tripPages > 1 ? (
          <nav aria-label="Transport booking pages" className="business-audit-pagination">
            {tripPage > 1 ? (
              <Link
                className="ui-button ui-button--secondary"
                href={pageHref(tripPage - 1, hotelPage)}
              >
                Previous page
              </Link>
            ) : (
              <span />
            )}
            <span>
              Page {tripPage} of {tripPages}
            </span>
            {tripPage < tripPages ? (
              <Link
                className="ui-button ui-button--secondary"
                href={pageHref(tripPage + 1, hotelPage)}
              >
                Next page
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Stays</p>
          <h2>Hotel bookings</h2>
        </div>
        {hotelGuests.length === 0 ? (
          <Card className="account-trips__empty">
            <strong>No hotel bookings yet.</strong>
          </Card>
        ) : (
          <div className="account-trips__list">
            {hotelGuests.map(({ booking }) => (
              <Card className="account-trip" key={booking.id}>
                <div className="account-trip__topline">
                  <span className="account-trip__type">HOTEL</span>
                  <strong>{booking.status}</strong>
                </div>
                <div className="account-trip__body">
                  <div>
                    <h3>{humanizeSlug(booking.hotelSlug)}</h3>
                    <p>Hotel stay</p>
                  </div>
                  <dl>
                    <div>
                      <dt>Stay dates</dt>
                      <dd>
                        {booking.quote.checkInDate} to {booking.quote.checkOutDate}
                      </dd>
                    </div>
                    <div>
                      <dt>Booking reference</dt>
                      <dd>{booking.confirmationCode}</dd>
                    </div>
                    <div>
                      <dt>Total</dt>
                      <dd>{formatCurrency(booking.totalAmount, booking.currency)}</dd>
                    </div>
                  </dl>
                </div>
                <div className="account-trip__actions">
                  <Link
                    className="ui-button ui-button--secondary"
                    href={`/manage-booking/${booking.confirmationCode}/voucher`}
                  >
                    View voucher
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
        {hotelPages > 1 ? (
          <nav aria-label="Hotel booking pages" className="business-audit-pagination">
            {hotelPage > 1 ? (
              <Link
                className="ui-button ui-button--secondary"
                href={pageHref(tripPage, hotelPage - 1)}
              >
                Previous page
              </Link>
            ) : (
              <span />
            )}
            <span>
              Page {hotelPage} of {hotelPages}
            </span>
            {hotelPage < hotelPages ? (
              <Link
                className="ui-button ui-button--secondary"
                href={pageHref(tripPage, hotelPage + 1)}
              >
                Next page
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </div>
    </section>
  );
}
