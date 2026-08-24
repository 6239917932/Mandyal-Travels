import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import {
  adminDocumentPath,
  documentCreatedAtRange,
  hotelDocumentPosture,
  normalizeAdminDocumentFilters,
  privateDocumentSubject,
  tripDocumentPosture,
  type DocumentReadiness,
} from '@/services/adminDocumentWorkbenchService';

export const metadata: Metadata = { title: 'Document readiness' };

const PAGE_SIZE = 25;

type AdminDocumentsPageProps = {
  searchParams: Promise<{
    from?: string | string[];
    hotelPage?: string | string[];
    product?: string | string[];
    q?: string | string[];
    to?: string | string[];
    tripPage?: string | string[];
  }>;
};

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    value,
  );
}

function postureLabel(value: DocumentReadiness): string {
  return value === 'UNAVAILABLE' ? 'NOT AVAILABLE' : value;
}

export default async function AdminDocumentsPage({ searchParams }: AdminDocumentsPageProps) {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/documents');
  const filters = normalizeAdminDocumentFilters(await searchParams);
  const createdAt = documentCreatedAtRange(filters.from, filters.to);
  const showHotels = filters.product === 'ALL' || filters.product === 'HOTEL';
  const showTrips = filters.product !== 'HOTEL';
  const hotelWhere = {
    ...(createdAt ? { createdAt } : {}),
    ...(filters.query
      ? {
          OR: [
            { confirmationCode: { contains: filters.query } },
            { hotelSlug: { contains: filters.query } },
            { guest: { is: { email: { contains: filters.query } } } },
          ],
        }
      : {}),
  };
  const tripWhere = {
    ...(createdAt ? { createdAt } : {}),
    ...(filters.product === 'ALL' ? {} : { productType: filters.product }),
    ...(filters.query
      ? {
          OR: [
            { confirmationCode: { contains: filters.query } },
            { email: { contains: filters.query } },
            { title: { contains: filters.query } },
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
          include: {
            amendments: { select: { status: true } },
            guest: { select: { email: true } },
            payment: { select: { amount: true, currency: true, status: true } },
            refunds: { select: { status: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (hotelPage - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          where: hotelWhere,
        })
      : [],
    showTrips
      ? prisma.customerTrip.findMany({
          orderBy: { createdAt: 'desc' },
          skip: (tripPage - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          where: tripWhere,
        })
      : [],
  ]);
  const pageReviewCount =
    hotels.filter((booking) => {
      const posture = hotelDocumentPosture({
        amendmentStatuses: booking.amendments.map((item) => item.status),
        bookingCurrency: booking.currency,
        bookingStatus: booking.status,
        bookingTotal: booking.totalAmount,
        paymentAmount: booking.payment?.amount ?? null,
        paymentCurrency: booking.payment?.currency ?? null,
        paymentStatus: booking.payment?.status ?? null,
        refundStatuses: booking.refunds.map((item) => item.status),
      });
      return posture.billing === 'REVIEW' || posture.confirmation === 'REVIEW';
    }).length +
    trips.filter((trip) => tripDocumentPosture(trip.status).confirmation === 'REVIEW').length;

  return (
    <section className="account-page business-report admin-workspace">
      <header className="admin-hero">
        <div>
          <p className="admin-hero__eyebrow">Protected document governance</p>
          <h1>Document readiness workbench</h1>
          <p>
            Inspect confirmation and payment evidence without exposing customer-only links or
            changing booking, payment, refund, or supplier state.
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/admin">
          Back to operations
        </Link>
      </header>

      <Card>
        <strong>Tax document boundary</strong>
        <p>
          Billing documents remain provisional payment receipts. This workbench does not create a
          statutory GST invoice, credit note, or supplier tax record.
        </p>
      </Card>

      <form className="business-report__filters" method="get">
        <div className="ui-field business-report__search">
          <label className="ui-field__label" htmlFor="admin-document-search">
            Reference, email, hotel, or journey
          </label>
          <input
            className="ui-input"
            defaultValue={filters.query}
            id="admin-document-search"
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
          <Link className="ui-button ui-button--secondary" href="/admin/documents">
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
          <span>Transport records</span>
          <strong>{tripCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Review on this page</span>
          <strong>{pageReviewCount.toLocaleString('en-IN')}</strong>
        </Card>
      </div>

      {showHotels ? (
        <section className="account-trips">
          <div className="account-trips__heading">
            <p className="hotel-page__eyebrow">Stays</p>
            <h2>Hotel vouchers and payment receipts</h2>
          </div>
          <Card className="business-report__table-card">
            <div className="business-report__table-scroll">
              <table className="business-report__table">
                <thead>
                  <tr>
                    <th>Private record</th>
                    <th>Booking</th>
                    <th>Confirmation</th>
                    <th>Billing receipt</th>
                    <th>Evidence</th>
                    <th>Recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {hotels.map((booking) => {
                    const posture = hotelDocumentPosture({
                      amendmentStatuses: booking.amendments.map((item) => item.status),
                      bookingCurrency: booking.currency,
                      bookingStatus: booking.status,
                      bookingTotal: booking.totalAmount,
                      paymentAmount: booking.payment?.amount ?? null,
                      paymentCurrency: booking.payment?.currency ?? null,
                      paymentStatus: booking.payment?.status ?? null,
                      refundStatuses: booking.refunds.map((item) => item.status),
                    });
                    return (
                      <tr key={booking.id}>
                        <td>
                          <strong>{privateDocumentSubject(booking.confirmationCode)}</strong>
                          <span>{booking.guest ? 'Guest-linked record' : 'Guest unavailable'}</span>
                        </td>
                        <td>
                          <Link
                            href={`/admin/bookings?q=${encodeURIComponent(booking.confirmationCode)}`}
                          >
                            {booking.confirmationCode}
                          </Link>
                          <span>{formatCurrency(booking.totalAmount, booking.currency)}</span>
                        </td>
                        <td>
                          <strong>{postureLabel(posture.confirmation)}</strong>
                        </td>
                        <td>
                          <strong>{postureLabel(posture.billing)}</strong>
                        </td>
                        <td>{posture.reason}</td>
                        <td>{formatDate(booking.createdAt)}</td>
                      </tr>
                    );
                  })}
                  {hotels.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No hotel document records match these filters.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
          <nav aria-label="Hotel document pages" className="business-audit-pagination">
            {hotelPage > 1 ? (
              <Link
                className="ui-button ui-button--secondary"
                href={adminDocumentPath(filters, { hotelPage: hotelPage - 1, tripPage })}
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
                href={adminDocumentPath(filters, { hotelPage: hotelPage + 1, tripPage })}
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
            <h2>Itineraries, tickets, and vouchers</h2>
          </div>
          <Card className="business-report__table-card">
            <div className="business-report__table-scroll">
              <table className="business-report__table">
                <thead>
                  <tr>
                    <th>Private record</th>
                    <th>Journey</th>
                    <th>Confirmation</th>
                    <th>Billing receipt</th>
                    <th>Evidence</th>
                    <th>Recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((trip) => {
                    const posture = tripDocumentPosture(trip.status);
                    return (
                      <tr key={trip.id}>
                        <td>
                          <strong>{privateDocumentSubject(trip.confirmationCode)}</strong>
                          <span>{trip.productType}</span>
                        </td>
                        <td>
                          <Link
                            href={`/admin/bookings?q=${encodeURIComponent(trip.confirmationCode)}`}
                          >
                            {trip.confirmationCode}
                          </Link>
                          <span>{trip.title}</span>
                        </td>
                        <td>
                          <strong>{postureLabel(posture.confirmation)}</strong>
                        </td>
                        <td>
                          <strong>{postureLabel(posture.billing)}</strong>
                        </td>
                        <td>{posture.reason}</td>
                        <td>{formatDate(trip.createdAt)}</td>
                      </tr>
                    );
                  })}
                  {trips.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No transport document records match these filters.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
          <nav aria-label="Transport document pages" className="business-audit-pagination">
            {tripPage > 1 ? (
              <Link
                className="ui-button ui-button--secondary"
                href={adminDocumentPath(filters, { hotelPage, tripPage: tripPage - 1 })}
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
                href={adminDocumentPath(filters, { hotelPage, tripPage: tripPage + 1 })}
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
