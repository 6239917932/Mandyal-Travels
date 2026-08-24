import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import { customerTravelHistoryPage } from '@/services/customerTravelHistoryRules';
import { getCustomerTravelHistory } from '@/services/customerTravelHistoryService';
import { customerTripServicingPath } from '@/services/customerTripServicingService';
import type {
  CustomerTravelHistoryEntry,
  CustomerTravelHistoryPage,
} from '@/types/customerTravelHistory';

export const metadata: Metadata = { title: 'My travel history' };

type TravelHistoryPageProps = {
  searchParams: Promise<{
    hotelPage?: string | string[];
    tripPage?: string | string[];
  }>;
};

function formatCurrency(amount: number | null, currency: 'INR' | null): string {
  if (amount === null || currency === null) return 'Under review';
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

function formatStatus(value: CustomerTravelHistoryEntry['status']): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function pageHref(tripPage: number, hotelPage: number): string {
  const query = new URLSearchParams({
    hotelPage: String(hotelPage),
    tripPage: String(tripPage),
  });
  return `/account/trips?${query.toString()}`;
}

function countLabel(page: CustomerTravelHistoryPage): string {
  return `${page.count}${page.isCapped ? '+' : ''}`;
}

function datesLabel(entry: CustomerTravelHistoryEntry): string {
  if (!entry.startDate) return 'Under review';
  return entry.endDate ? `${entry.startDate} to ${entry.endDate}` : entry.startDate;
}

function HistoryEntry({ entry }: { entry: CustomerTravelHistoryEntry }) {
  return (
    <Card className="account-trip">
      <div className="account-trip__topline">
        <span className="account-trip__type">{entry.product}</span>
        <strong>{formatStatus(entry.status)}</strong>
      </div>
      <div className="account-trip__body">
        <div>
          <h3>{entry.title}</h3>
          <p>{entry.subtitle}</p>
        </div>
        <dl>
          <div>
            <dt>{entry.product === 'HOTEL' ? 'Stay dates' : 'Travel dates'}</dt>
            <dd>{datesLabel(entry)}</dd>
          </div>
          <div>
            <dt>Booking reference</dt>
            <dd>{entry.bookingReference}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{formatCurrency(entry.totalAmount, entry.currency)}</dd>
          </div>
        </dl>
      </div>
      <div className="account-trip__actions">
        <Link className="ui-button ui-button--secondary" href={entry.detailHref}>
          View booking details
        </Link>
        {entry.document ? (
          <Link className="ui-button ui-button--secondary" href={entry.document.href}>
            {entry.document.label}
          </Link>
        ) : null}
        {entry.product !== 'HOTEL' ? (
          <Link
            className="ui-button ui-button--secondary"
            href={customerTripServicingPath({
              confirmationCode: entry.bookingReference,
              productType: entry.product,
            })}
          >
            Request servicing
          </Link>
        ) : null}
      </div>
      {entry.product !== 'HOTEL' ? (
        <p className="booking-confirmation__fine-print">
          Requests are reviewed by operations and do not automatically change or cancel a booking or
          guarantee a refund.
        </p>
      ) : null}
    </Card>
  );
}

function HistoryPagination({
  history,
  hotelPage,
  label,
  tripPage,
  type,
}: {
  history: CustomerTravelHistoryPage;
  hotelPage: number;
  label: string;
  tripPage: number;
  type: 'hotel' | 'transport';
}) {
  if (history.pages <= 1) return null;
  const previousTripPage = type === 'transport' ? history.page - 1 : tripPage;
  const previousHotelPage = type === 'hotel' ? history.page - 1 : hotelPage;
  const nextTripPage = type === 'transport' ? history.page + 1 : tripPage;
  const nextHotelPage = type === 'hotel' ? history.page + 1 : hotelPage;

  return (
    <nav aria-label={label} className="business-audit-pagination">
      {history.page > 1 ? (
        <Link
          className="ui-button ui-button--secondary"
          href={pageHref(previousTripPage, previousHotelPage)}
        >
          Previous page
        </Link>
      ) : (
        <span />
      )}
      <span>
        Page {history.page} of {history.pages}
      </span>
      {history.page < history.pages ? (
        <Link
          className="ui-button ui-button--secondary"
          href={pageHref(nextTripPage, nextHotelPage)}
        >
          Next page
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export default async function TravelHistoryPage({ searchParams }: TravelHistoryPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=%2Faccount%2Ftrips');

  const values = await searchParams;
  const history = await getCustomerTravelHistory({
    hotelPage: customerTravelHistoryPage(values.hotelPage),
    sessionEmail: user.email,
    transportPage: customerTravelHistoryPage(values.tripPage),
    userId: user.id,
  });
  const total = history.transport.count + history.hotels.count;
  const totalIsCapped = history.transport.isCapped || history.hotels.isCapped;

  return (
    <section className="account-page">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Your journeys</p>
          <h1>Complete travel history</h1>
          <p>Bookings securely matched to your signed-in account.</p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/account#my-trips">
          Back to my account
        </Link>
      </div>

      <div className="partner-bookings__summary">
        <Card>
          <span>Flight, bus, and car bookings</span>
          <strong>{countLabel(history.transport)}</strong>
        </Card>
        <Card>
          <span>Hotel bookings</span>
          <strong>{countLabel(history.hotels)}</strong>
        </Card>
        <Card>
          <span>Total journeys</span>
          <strong>
            {total}
            {totalIsCapped ? '+' : ''}
          </strong>
        </Card>
      </div>

      {totalIsCapped ? (
        <Card className="account-trips__empty">
          <strong>This directory shows no more than the latest 500 bookings in a category.</strong>
          <p>Contact support if you need an older booking.</p>
        </Card>
      ) : null}

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Transport and rentals</p>
          <h2>Flights, buses, and cars</h2>
        </div>
        {history.transport.entries.length === 0 ? (
          <Card className="account-trips__empty">
            <strong>No flight, bus, or car bookings on this page.</strong>
          </Card>
        ) : (
          <div className="account-trips__list">
            {history.transport.entries.map((entry) => (
              <HistoryEntry entry={entry} key={`${entry.product}-${entry.bookingReference}`} />
            ))}
          </div>
        )}
        <HistoryPagination
          history={history.transport}
          hotelPage={history.hotels.page}
          label="Transport booking pages"
          tripPage={history.transport.page}
          type="transport"
        />
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Stays</p>
          <h2>Hotel bookings</h2>
        </div>
        {history.hotels.entries.length === 0 ? (
          <Card className="account-trips__empty">
            <strong>No hotel bookings on this page.</strong>
          </Card>
        ) : (
          <div className="account-trips__list">
            {history.hotels.entries.map((entry) => (
              <HistoryEntry entry={entry} key={`${entry.product}-${entry.bookingReference}`} />
            ))}
          </div>
        )}
        <HistoryPagination
          history={history.hotels}
          hotelPage={history.hotels.page}
          label="Hotel booking pages"
          tripPage={history.transport.page}
          type="hotel"
        />
      </div>
    </section>
  );
}
