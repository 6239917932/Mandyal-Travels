import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import { customerTripServicingPath } from '@/services/customerTripServicingService';
import {
  CustomerTransportHistoryLimitError,
  getCustomerTransportTripDetail,
} from '@/services/customerTransportTripDetailService';
import type {
  CustomerTransportBookingStatus,
  CustomerTransportServicingEvent,
  CustomerTransportTripDetail,
} from '@/types/customerTransportTripDetail';

import styles from './page.module.css';

export const metadata: Metadata = { title: 'Transport booking details' };

const BOOKING_LABELS: Readonly<Record<CustomerTransportBookingStatus, string>> = {
  CANCELLED: 'Cancelled',
  CONFIRMED: 'Confirmed in Mandyal',
  PROCESSING: 'Processing',
  UNDER_REVIEW: 'Under review',
};

const EVENT_LABELS: Readonly<Record<CustomerTransportServicingEvent['status'], string>> = {
  CLOSED: 'Closed',
  OPEN: 'Open',
  RECORDED: 'Recorded',
  UNDER_REVIEW: 'Under review',
};

const PRODUCT_LABELS: Readonly<Record<CustomerTransportTripDetail['product'], string>> = {
  BUS: 'Bus booking',
  CAR: 'Car booking',
  FLIGHT: 'Flight booking',
};

function formatCurrency(amount: number | null, currency: 'INR' | null): string {
  if (amount === null || currency === null) return 'Under review';
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

type CustomerTransportTripDetailPageProps = {
  params: Promise<{ confirmationCode: string }>;
};

export default async function CustomerTransportTripDetailPage({
  params,
}: CustomerTransportTripDetailPageProps) {
  const user = await getCurrentUser();
  const { confirmationCode } = await params;
  if (!user) {
    const returnTo = `/account/trips/${encodeURIComponent(confirmationCode)}`;
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  let trip;
  try {
    trip = await getCustomerTransportTripDetail({
      confirmationCode,
      sessionEmail: user.email,
      userId: user.id,
    });
  } catch (error) {
    if (error instanceof CustomerTransportHistoryLimitError) {
      return (
        <section className={styles.page}>
          <Card className={styles.state} role="status">
            <p className={styles.eyebrow}>Transport booking</p>
            <h1>More history than this view can safely display</h1>
            <p>Contact support for help with the complete servicing record.</p>
            <Link className="ui-button ui-button--primary" href="/account/support">
              Contact support
            </Link>
          </Card>
        </section>
      );
    }
    throw error;
  }

  if (!trip) {
    return (
      <section className={styles.page}>
        <Card className={styles.state} role="status">
          <p className={styles.eyebrow}>Transport booking</p>
          <h1>Booking details unavailable</h1>
          <p>This reference was not found or is not connected to the signed-in account.</p>
          <Link className="ui-button ui-button--secondary" href="/account/trips">
            Back to travel history
          </Link>
        </Card>
      </section>
    );
  }

  const servicingPath = customerTripServicingPath({
    confirmationCode: trip.bookingReference,
    productType: trip.product,
  });

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{PRODUCT_LABELS[trip.product]}</p>
          <h1>{trip.title}</h1>
          <p>{trip.subtitle}</p>
          <small>Reference {trip.bookingReference}</small>
        </div>
        <Link className="ui-button ui-button--secondary" href="/account/trips">
          Back to travel history
        </Link>
      </header>

      <div className={styles.summary} role="group" aria-label="Transport booking summary">
        <Card>
          <span>Booking record</span>
          <strong>{BOOKING_LABELS[trip.bookingStatus]}</strong>
        </Card>
        <Card>
          <span>Travel date</span>
          <strong>{trip.startDate ?? 'Under review'}</strong>
          <small>{trip.endDate ? `to ${trip.endDate}` : 'Single service date'}</small>
        </Card>
        <Card>
          <span>Recorded total</span>
          <strong>{formatCurrency(trip.totalAmount, trip.currency)}</strong>
        </Card>
      </div>

      <div className={styles.twoColumn}>
        <Card className={styles.details}>
          <p className={styles.eyebrow}>Safe booking facts</p>
          <h2>Travel details</h2>
          {trip.facts.length === 0 ? (
            <p>Additional travel facts are unavailable or under review.</p>
          ) : (
            <dl>
              {trip.facts.map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </Card>

        <Card className={styles.providerNotice} role="note">
          <p className={styles.eyebrow}>Provider fulfilment</p>
          <h2>Connection pending</h2>
          <p>{trip.fulfillment.message}</p>
          <small>
            Contact support before relying on this record for check-in, boarding, pickup, changes,
            or cancellation.
          </small>
        </Card>
      </div>

      <Card className={styles.history}>
        <div>
          <p className={styles.eyebrow}>Read-only record</p>
          <h2>Servicing history</h2>
          <p>Booking and account-owned support milestones recorded in Mandyal Travels.</p>
        </div>
        <ol>
          {trip.servicingHistory.map((event) => (
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

      <nav aria-label="Transport booking actions" className={styles.actions}>
        <Link className="ui-button ui-button--primary" href={servicingPath}>
          Request servicing
        </Link>
        <Link className="ui-button ui-button--secondary" href="/account/support">
          View support cases
        </Link>
      </nav>
      <p className={styles.notice} role="note">
        This page cannot change or cancel travel, choose seats or vehicles, operate a payment or
        refund, or confirm supplier fulfilment. Requests remain subject to human review and provider
        rules.
      </p>
    </section>
  );
}
