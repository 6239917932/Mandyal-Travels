import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import {
  CustomerPaymentHistoryLimitError,
  getCustomerPaymentActivity,
} from '@/services/customerPaymentActivityService';
import { normalizeCustomerPaymentPage } from '@/services/customerPaymentActivityRules';
import type {
  CustomerHotelBookingStatus,
  CustomerPaymentStatus,
  CustomerRefundStatus,
} from '@/types/customerPaymentActivity';

export const metadata: Metadata = { title: 'Hotel payment activity' };

type CustomerPaymentsPageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

const PAYMENT_LABELS: Record<CustomerPaymentStatus, string> = {
  PAID: 'Paid',
  PROCESSING: 'Processing',
  REFUNDED: 'Refunded',
  UNDER_REVIEW: 'Under review',
  UNSUCCESSFUL: 'Unsuccessful',
};

const BOOKING_LABELS: Record<CustomerHotelBookingStatus, string> = {
  CANCELLED: 'Cancelled',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  UNDER_REVIEW: 'Under review',
};

const REFUND_LABELS: Record<CustomerRefundStatus, string> = {
  COMPLETED: 'Completed',
  DELAYED: 'Delayed — support is reviewing',
  NOT_APPROVED: 'Not approved',
  PROCESSING: 'Processing',
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

function pagePath(page: number): string {
  return `/account/payments?page=${page}`;
}

export default async function CustomerPaymentsPage({ searchParams }: CustomerPaymentsPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=%2Faccount%2Fpayments');

  const values = await searchParams;
  const requestedPage = normalizeCustomerPaymentPage(values.page);
  let activity;
  try {
    activity = await getCustomerPaymentActivity(user.email, requestedPage);
  } catch (error) {
    if (error instanceof CustomerPaymentHistoryLimitError) {
      return (
        <section className="account-page customer-payments">
          <div className="partner-page__heading">
            <div>
              <p className="hotel-page__eyebrow">Hotel payments</p>
              <h1>Payment and refund activity</h1>
            </div>
            <Link className="ui-button ui-button--secondary" href="/account/support">
              Contact support
            </Link>
          </div>
          <Card className="customer-payments__empty" role="status">
            <h2>More history than this view can safely display</h2>
            <p>Contact support for help locating an older hotel payment or refund.</p>
          </Card>
        </section>
      );
    }
    throw error;
  }

  const completedRefunds = activity.activities.reduce(
    (count, payment) =>
      count + payment.refunds.filter((refund) => refund.status === 'COMPLETED').length,
    0,
  );
  const openRefunds = activity.activities.reduce(
    (count, payment) =>
      count +
      payment.refunds.filter((refund) =>
        ['REQUEST_RECEIVED', 'PROCESSING', 'DELAYED', 'UNDER_REVIEW'].includes(refund.status),
      ).length,
    0,
  );

  return (
    <section className="account-page customer-payments">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Hotel payments</p>
          <h1>Payment and refund activity</h1>
          <p>
            A private, read-only history for hotel bookings made with {user.email}. Flight, bus, and
            car payment records are not connected to this view yet.
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/account/trips">
          View travel history
        </Link>
      </div>

      <div className="partner-bookings__summary" aria-label="Hotel payment summary">
        <Card>
          <span>Hotel payments</span>
          <strong>{activity.totalCount}</strong>
        </Card>
        <Card>
          <span>Open refund updates on this page</span>
          <strong>{openRefunds}</strong>
        </Card>
        <Card>
          <span>Completed refunds on this page</span>
          <strong>{completedRefunds}</strong>
        </Card>
      </div>

      <p className="customer-payments__notice" role="note">
        This page reports recorded status only. It cannot capture a payment, start or approve a
        refund, or change a booking.
      </p>

      {activity.activities.length === 0 ? (
        <Card className="customer-payments__empty" role="status">
          <h2>No hotel payment activity yet</h2>
          <p>Hotel payments and refund updates connected to this account will appear here.</p>
          <Link className="ui-button ui-button--primary" href="/hotels">
            Explore hotels
          </Link>
        </Card>
      ) : (
        <div className="customer-payments__list">
          {activity.activities.map((payment) => (
            <Card className="customer-payment" key={payment.bookingReference}>
              <div className="customer-payment__heading">
                <div>
                  <p className="hotel-page__eyebrow">{payment.bookingReference}</p>
                  <h2>{payment.hotelName}</h2>
                  <p>
                    Stay {payment.stay.checkInDate} to {payment.stay.checkOutDate}
                  </p>
                </div>
                <span
                  className={`customer-payment__status customer-payment__status--${payment.paymentStatus.toLowerCase().replace('_', '-')}`}
                >
                  {PAYMENT_LABELS[payment.paymentStatus]}
                </span>
              </div>

              <dl className="customer-payment__facts">
                <div>
                  <dt>Recorded amount</dt>
                  <dd>{formatCurrency(payment.paymentAmount, payment.currency)}</dd>
                </div>
                <div>
                  <dt>Recorded on</dt>
                  <dd>{formatDate(payment.createdAt)}</dd>
                </div>
                <div>
                  <dt>Booking status</dt>
                  <dd>{BOOKING_LABELS[payment.bookingStatus]}</dd>
                </div>
              </dl>

              {payment.refundCount > 0 ? (
                <div className="customer-payment__refunds">
                  <h3>Refund updates</h3>
                  <div className="customer-payment__refund-list">
                    {payment.refunds.map((refund, index) => (
                      <div
                        className="customer-payment__refund"
                        key={`${refund.createdAt}-${index}`}
                      >
                        <div>
                          <strong>{REFUND_LABELS[refund.status]}</strong>
                          <span>Requested {formatDate(refund.createdAt)}</span>
                        </div>
                        <strong>{formatCurrency(refund.amount, refund.currency)}</strong>
                      </div>
                    ))}
                  </div>
                  {payment.refundCount > payment.refunds.length ? (
                    <p className="customer-payment__more-refunds">
                      Showing the {payment.refunds.length} most recent of {payment.refundCount}{' '}
                      refund updates. Contact support for older activity.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="customer-payment__no-refund">No refund activity is recorded.</p>
              )}

              <div className="customer-payment__actions">
                <Link className="ui-button ui-button--secondary" href="/manage-booking">
                  Manage booking
                </Link>
                <Link
                  className="ui-button ui-button--secondary"
                  href={`/manage-booking/${payment.bookingReference}/invoice`}
                >
                  View receipt
                </Link>
                <Link
                  className="ui-button ui-button--secondary"
                  href={`/account/support?bookingReference=${encodeURIComponent(payment.bookingReference)}&category=PAYMENT`}
                >
                  Ask for help
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activity.pageCount > 1 ? (
        <nav aria-label="Hotel payment activity pages" className="business-audit-pagination">
          {activity.page > 1 ? (
            <Link className="ui-button ui-button--secondary" href={pagePath(activity.page - 1)}>
              Previous page
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {activity.page} of {activity.pageCount}
          </span>
          {activity.page < activity.pageCount ? (
            <Link className="ui-button ui-button--secondary" href={pagePath(activity.page + 1)}>
              Next page
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </section>
  );
}
