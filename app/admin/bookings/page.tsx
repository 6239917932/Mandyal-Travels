import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import {
  adminBookingDirectoryPath,
  bookingCreatedAtRange,
  normalizeAdminBookingDirectoryFilters,
} from '@/services/adminBookingDirectoryService';

export const metadata: Metadata = { title: 'Booking operations' };

const PAGE_SIZE = 25;

type AdminBookingsPageProps = {
  searchParams: Promise<{
    from?: string | string[];
    hotelPage?: string | string[];
    product?: string | string[];
    q?: string | string[];
    status?: string | string[];
    to?: string | string[];
    tripPage?: string | string[];
  }>;
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    value,
  );
}

export default async function AdminBookingsPage({ searchParams }: AdminBookingsPageProps) {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/bookings');
  const filters = normalizeAdminBookingDirectoryFilters(await searchParams);
  const createdAt = bookingCreatedAtRange(filters.from, filters.to);
  const showHotels = filters.product === 'ALL' || filters.product === 'HOTEL';
  const showTrips = filters.product !== 'HOTEL';
  const hotelWhere = {
    ...(createdAt ? { createdAt } : {}),
    ...(filters.status === 'ALL' ? {} : { status: filters.status.toLowerCase() }),
    ...(filters.query
      ? {
          OR: [
            { confirmationCode: { contains: filters.query } },
            { hotelSlug: { contains: filters.query } },
            { guest: { is: { email: { contains: filters.query } } } },
            { guest: { is: { firstName: { contains: filters.query } } } },
            { guest: { is: { lastName: { contains: filters.query } } } },
          ],
        }
      : {}),
  };
  const tripWhere = {
    ...(createdAt ? { createdAt } : {}),
    ...(filters.product === 'ALL' ? {} : { productType: filters.product }),
    ...(filters.status === 'ALL' ? {} : { status: filters.status }),
    ...(filters.query
      ? {
          OR: [
            { confirmationCode: { contains: filters.query } },
            { email: { contains: filters.query } },
            { title: { contains: filters.query } },
            { user: { is: { firstName: { contains: filters.query } } } },
            { user: { is: { lastName: { contains: filters.query } } } },
          ],
        }
      : {}),
  };

  const [hotelCount, tripCount] = await Promise.all([
    showHotels ? prisma.booking.count({ where: hotelWhere }) : 0,
    showTrips ? prisma.customerTrip.count({ where: tripWhere }) : 0,
  ]);
  const hotelPages = Math.max(1, Math.ceil(hotelCount / PAGE_SIZE));
  const tripPages = Math.max(1, Math.ceil(tripCount / PAGE_SIZE));
  const hotelPage = Math.min(filters.hotelPage, hotelPages);
  const tripPage = Math.min(filters.tripPage, tripPages);
  const [hotels, trips] = await Promise.all([
    showHotels
      ? prisma.booking.findMany({
          include: { guest: true, quote: { select: { checkInDate: true, checkOutDate: true } } },
          orderBy: { createdAt: 'desc' },
          skip: (hotelPage - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          where: hotelWhere,
        })
      : [],
    showTrips
      ? prisma.customerTrip.findMany({
          include: { user: { select: { firstName: true, id: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          skip: (tripPage - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          where: tripWhere,
        })
      : [],
  ]);

  return (
    <section className="account-page business-report admin-workspace">
      <header className="admin-hero">
        <div>
          <p className="admin-hero__eyebrow">Read-only servicing directory</p>
          <h1>Booking operations</h1>
          <p>
            Find Hotel, Flight, Bus, and Car records without changing booking, inventory, payment,
            or refund state.
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/admin">
          Back to operations
        </Link>
      </header>

      <form className="business-report__filters" method="get">
        <div className="ui-field business-report__search">
          <label className="ui-field__label" htmlFor="admin-booking-search">
            Reference, traveller, email, hotel, or trip
          </label>
          <input
            className="ui-input"
            defaultValue={filters.query}
            id="admin-booking-search"
            maxLength={100}
            name="q"
            type="search"
          />
        </div>
        <label className="ui-field">
          <span className="ui-field__label">Product</span>
          <select className="ui-input" defaultValue={filters.product} name="product">
            {['ALL', 'HOTEL', 'FLIGHT', 'BUS', 'CAR'].map((product) => (
              <option key={product} value={product}>
                {product === 'ALL' ? 'All products' : product}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Status</span>
          <select className="ui-input" defaultValue={filters.status} name="status">
            {['ALL', 'CONFIRMED', 'PENDING', 'CANCELLED', 'COMPLETED', 'FAILED'].map((status) => (
              <option key={status} value={status}>
                {status === 'ALL' ? 'All statuses' : status}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Created from</span>
          <input className="ui-input" defaultValue={filters.from} name="from" type="date" />
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Created to</span>
          <input className="ui-input" defaultValue={filters.to} name="to" type="date" />
        </label>
        <div className="business-report__filter-actions">
          <button className="ui-button ui-button--primary" type="submit">
            Apply filters
          </button>
          <Link className="ui-button ui-button--secondary" href="/admin/bookings">
            Clear
          </Link>
        </div>
      </form>

      <div className="partner-bookings__summary">
        <Card>
          <span>Hotel records</span>
          <strong>{hotelCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Flight, Bus, and Car records</span>
          <strong>{tripCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Filtered total</span>
          <strong>{(hotelCount + tripCount).toLocaleString('en-IN')}</strong>
        </Card>
      </div>

      {showHotels ? (
        <section className="account-trips">
          <div className="account-trips__heading">
            <p className="hotel-page__eyebrow">Stays</p>
            <h2>Hotel bookings</h2>
          </div>
          <Card className="business-report__table-card">
            <div className="business-report__table-scroll">
              <table className="business-report__table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Hotel and stay</th>
                    <th>Traveller</th>
                    <th>State</th>
                    <th>Value</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {hotels.map((booking) => (
                    <tr key={booking.id}>
                      <td>
                        <strong>{booking.confirmationCode}</strong>
                        <span>HOTEL</span>
                        <Link
                          href={`/admin/bookings/${encodeURIComponent(booking.confirmationCode)}`}
                        >
                          View dossier
                        </Link>
                      </td>
                      <td>
                        <strong>{booking.hotelSlug.replaceAll('-', ' ')}</strong>
                        <span>
                          {booking.quote.checkInDate} to {booking.quote.checkOutDate}
                        </span>
                      </td>
                      <td>
                        <strong>
                          {booking.guest
                            ? `${booking.guest.firstName} ${booking.guest.lastName}`
                            : 'Guest record unavailable'}
                        </strong>
                        {booking.guest ? (
                          <Link href={`/admin/users?q=${encodeURIComponent(booking.guest.email)}`}>
                            {booking.guest.email}
                          </Link>
                        ) : null}
                      </td>
                      <td>
                        <strong>{booking.status.toUpperCase()}</strong>
                        <span>{booking.operationalStatus.replaceAll('_', ' ')}</span>
                      </td>
                      <td>{formatCurrency(booking.totalAmount, booking.currency)}</td>
                      <td>{formatDate(booking.createdAt)}</td>
                    </tr>
                  ))}
                  {hotels.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No hotel bookings match these filters.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
          <nav aria-label="Hotel booking directory pages" className="business-audit-pagination">
            {hotelPage > 1 ? (
              <Link
                className="ui-button ui-button--secondary"
                href={adminBookingDirectoryPath(filters, { hotelPage: hotelPage - 1, tripPage })}
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
                href={adminBookingDirectoryPath(filters, { hotelPage: hotelPage + 1, tripPage })}
              >
                Next page
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </section>
      ) : null}

      {showTrips ? (
        <section className="account-trips">
          <div className="account-trips__heading">
            <p className="hotel-page__eyebrow">Transport and rentals</p>
            <h2>Flight, Bus, and Car bookings</h2>
          </div>
          <Card className="business-report__table-card">
            <div className="business-report__table-scroll">
              <table className="business-report__table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Journey</th>
                    <th>Traveller</th>
                    <th>State</th>
                    <th>Value</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((trip) => (
                    <tr key={trip.id}>
                      <td>
                        <strong>{trip.confirmationCode}</strong>
                        <span>{trip.productType}</span>
                        <Link href={`/admin/bookings/${encodeURIComponent(trip.confirmationCode)}`}>
                          View dossier
                        </Link>
                      </td>
                      <td>
                        <strong>{trip.title}</strong>
                        <span>
                          {trip.startDate}
                          {trip.endDate ? ` to ${trip.endDate}` : ''}
                        </span>
                      </td>
                      <td>
                        <strong>
                          {trip.user
                            ? `${trip.user.firstName} ${trip.user.lastName}`
                            : 'Customer account unavailable'}
                        </strong>
                        {trip.user ? (
                          <Link href={`/admin/users/${trip.user.id}`}>{trip.email}</Link>
                        ) : (
                          <Link href={`/admin/users?q=${encodeURIComponent(trip.email)}`}>
                            {trip.email}
                          </Link>
                        )}
                      </td>
                      <td>{trip.status}</td>
                      <td>{formatCurrency(trip.totalAmount, trip.currency)}</td>
                      <td>{formatDate(trip.createdAt)}</td>
                    </tr>
                  ))}
                  {trips.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No transport or rental bookings match these filters.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
          <nav aria-label="Transport booking directory pages" className="business-audit-pagination">
            {tripPage > 1 ? (
              <Link
                className="ui-button ui-button--secondary"
                href={adminBookingDirectoryPath(filters, { hotelPage, tripPage: tripPage - 1 })}
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
                href={adminBookingDirectoryPath(filters, { hotelPage, tripPage: tripPage + 1 })}
              >
                Next page
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </section>
      ) : null}
    </section>
  );
}
