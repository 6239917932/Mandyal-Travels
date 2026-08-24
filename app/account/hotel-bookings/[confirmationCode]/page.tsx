import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import {
  CustomerHotelServicingHistoryLimitError,
  getCustomerHotelBookingDetail,
} from '@/services/customerHotelBookingDetailService';
import type {
  CustomerHotelBookingStatus,
  CustomerHotelServicingEvent,
  CustomerHotelStayStatus,
} from '@/types/customerHotelBookingDetail';
import styles from './page.module.css';

export const metadata: Metadata = { title: 'Hotel booking details' };

const BOOKING_LABELS: Readonly<Record<CustomerHotelBookingStatus, string>> = {
  CANCELLED: 'Cancelled',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  UNDER_REVIEW: 'Under review',
};

const STAY_LABELS: Readonly<Record<CustomerHotelStayStatus, string>> = {
  CANCELLED: 'Cancelled',
  CHECKED_IN: 'Checked in',
  COMPLETED: 'Completed',
  DID_NOT_CHECK_IN: 'Not checked in',
  UPCOMING: 'Upcoming',
  UNDER_REVIEW: 'Under review',
};

const EVENT_LABELS: Readonly<Record<CustomerHotelServicingEvent['status'], string>> = {
  APPROVED: 'Approved',
  CLOSED: 'Closed',
  CONFIRMED: 'Confirmed',
  NOT_APPROVED: 'Not approved',
  OPEN: 'Open',
  REQUEST_RECEIVED: 'Request received',
  UNDER_REVIEW: 'Under review',
};

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function supportPath(reference: string): string {
  const query = new URLSearchParams({ bookingReference: reference, category: 'BOOKING' });
  return `/account/support?${query.toString()}`;
}

type HotelBookingDetailPageProps = {
  params: Promise<{ confirmationCode: string }>;
};

export default async function HotelBookingDetailPage({ params }: HotelBookingDetailPageProps) {
  const user = await getCurrentUser();
  const { confirmationCode } = await params;
  if (!user) {
    const returnTo = `/account/hotel-bookings/${encodeURIComponent(confirmationCode)}`;
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  let booking;
  try {
    booking = await getCustomerHotelBookingDetail({
      confirmationCode,
      sessionEmail: user.email,
      userId: user.id,
    });
  } catch (error) {
    if (error instanceof CustomerHotelServicingHistoryLimitError) {
      return (
        <section className={styles.page}>
          <Card className={styles.state} role="status">
            <p className={styles.eyebrow}>Hotel booking</p>
            <h1>More history than this view can safely display</h1>
            <p>Contact support to receive help with the complete servicing record.</p>
            <Link className="ui-button ui-button--primary" href="/account/support">
              Contact support
            </Link>
          </Card>
        </section>
      );
    }
    throw error;
  }

  if (!booking) {
    return (
      <section className={styles.page}>
        <Card className={styles.state} role="status">
          <p className={styles.eyebrow}>Hotel booking</p>
          <h1>Booking details unavailable</h1>
          <p>This reference was not found or is not connected to the signed-in account.</p>
          <Link className="ui-button ui-button--secondary" href="/account/trips">
            Back to travel history
          </Link>
        </Card>
      </section>
    );
  }

  const encodedReference = encodeURIComponent(booking.bookingReference);
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Hotel booking</p>
          <h1>{booking.hotelName}</h1>
          <p>Reference {booking.bookingReference}</p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/account/trips">
          Back to travel history
        </Link>
      </header>

      <div aria-label="Hotel booking summary" className={styles.summary}>
        <Card>
          <span>Booking</span>
          <strong>{BOOKING_LABELS[booking.bookingStatus]}</strong>
        </Card>
        <Card>
          <span>Stay</span>
          <strong>{STAY_LABELS[booking.stay.status]}</strong>
        </Card>
        <Card>
          <span>Current total</span>
          <strong>{formatCurrency(booking.totalAmount, booking.currency)}</strong>
        </Card>
      </div>

      <Card className={styles.details}>
        <h2>Stay details</h2>
        <dl>
          <div>
            <dt>Check-in</dt>
            <dd>{booking.stay.checkInDate}</dd>
          </div>
          <div>
            <dt>Check-out</dt>
            <dd>{booking.stay.checkOutDate}</dd>
          </div>
          <div>
            <dt>Rooms</dt>
            <dd>{booking.rooms}</dd>
          </div>
          <div>
            <dt>Booked on</dt>
            <dd>{formatDate(booking.bookedAt)}</dd>
          </div>
        </dl>
      </Card>

      <Card className={styles.history}>
        <div>
          <p className={styles.eyebrow}>Read-only record</p>
          <h2>Servicing history</h2>
          <p>Date-change and support milestones recorded for this hotel booking.</p>
        </div>
        <ol>
          {booking.servicingHistory.map((event) => (
            <li key={event.key}>
              <div className={styles.eventHeading}>
                <strong>{event.title}</strong>
                <span>{EVENT_LABELS[event.status]}</span>
              </div>
              <p>{event.description}</p>
              <time dateTime={event.at}>{formatDate(event.at)}</time>
            </li>
          ))}
        </ol>
      </Card>

      <nav aria-label="Hotel booking actions" className={styles.actions}>
        <Link
          className="ui-button ui-button--secondary"
          href={`/manage-booking/${encodedReference}/voucher`}
        >
          View voucher
        </Link>
        <Link
          className="ui-button ui-button--secondary"
          href={`/manage-booking/${encodedReference}/invoice`}
        >
          View receipt
        </Link>
        <Link className="ui-button ui-button--secondary" href="/manage-booking">
          Manage booking
        </Link>
        <Link className="ui-button ui-button--primary" href={supportPath(booking.bookingReference)}>
          Contact support
        </Link>
      </nav>
      <p className={styles.notice} role="note">
        This page is a read-only record. It cannot change a stay, approve a request, charge a
        payment, or issue a refund.
      </p>
    </section>
  );
}
