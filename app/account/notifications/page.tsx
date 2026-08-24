import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Prisma } from '@/generated/prisma/client';

import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import {
  CUSTOMER_NOTIFICATION_CHANNELS,
  CUSTOMER_NOTIFICATION_PAGE_SIZE,
  CUSTOMER_NOTIFICATION_RESULT_LIMIT,
  CUSTOMER_NOTIFICATION_STATUSES,
  CUSTOMER_NOTIFICATION_WINDOWS,
  customerNotificationChannelLabel,
  customerNotificationInternalStatuses,
  customerNotificationPath,
  customerNotificationStatus,
  customerNotificationTitle,
  customerNotificationWindowStart,
  normalizeCustomerNotificationFilters,
} from '@/services/customerNotificationCenterService';

export const metadata: Metadata = { title: 'My notifications' };

type SearchValue = string | string[] | undefined;
type CustomerNotificationsPageProps = {
  searchParams: Promise<{
    channel?: SearchValue;
    page?: SearchValue;
    status?: SearchValue;
    window?: SearchValue;
  }>;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

export default async function CustomerNotificationsPage({
  searchParams,
}: CustomerNotificationsPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=%2Faccount%2Fnotifications');

  const filters = normalizeCustomerNotificationFilters(await searchParams);
  const start = customerNotificationWindowStart(filters.window, new Date());
  const statuses = customerNotificationInternalStatuses(filters.status);
  const where: Prisma.NotificationDeliveryWhereInput = {
    userId: user.id,
    ...(filters.channel === 'ALL' ? {} : { channel: filters.channel }),
    ...(statuses ? { status: { in: statuses } } : {}),
    ...(start ? { createdAt: { gte: start } } : {}),
  };
  const [matchingCount, deliveredCount, delayedCount] = await Promise.all([
    prisma.notificationDelivery.count({ where }),
    prisma.notificationDelivery.count({ where: { status: 'DELIVERED', userId: user.id } }),
    prisma.notificationDelivery.count({
      where: { status: { in: ['FAILED', 'DEAD_LETTER'] }, userId: user.id },
    }),
  ]);
  const boundedCount = Math.min(matchingCount, CUSTOMER_NOTIFICATION_RESULT_LIMIT);
  const pageCount = Math.max(1, Math.ceil(boundedCount / CUSTOMER_NOTIFICATION_PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const deliveries = await prisma.notificationDelivery.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    select: {
      channel: true,
      createdAt: true,
      deliveredAt: true,
      status: true,
      template: { select: { templateKey: true } },
    },
    skip: (page - 1) * CUSTOMER_NOTIFICATION_PAGE_SIZE,
    take: CUSTOMER_NOTIFICATION_PAGE_SIZE,
    where,
  });
  const activeFilters = { ...filters, page };

  return (
    <section className="account-page business-report">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Communication history</p>
          <h1>My notifications</h1>
          <p>Track booking, payment, security, and support messages prepared for your account.</p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/account">
          Back to my account
        </Link>
      </div>

      <div className="partner-bookings__summary">
        <Card>
          <span>Matching updates</span>
          <strong>{matchingCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Delivered</span>
          <strong>{deliveredCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card className={delayedCount ? 'admin-metric admin-metric--attention' : 'admin-metric'}>
          <span>Delivery delayed</span>
          <strong>{delayedCount.toLocaleString('en-IN')}</strong>
        </Card>
      </div>

      <form className="business-report__filters" method="get">
        <label className="ui-field">
          <span className="ui-field__label">Status</span>
          <select className="ui-input" defaultValue={filters.status} name="status">
            {CUSTOMER_NOTIFICATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === 'ALL' ? 'All statuses' : status.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Channel</span>
          <select className="ui-input" defaultValue={filters.channel} name="channel">
            {CUSTOMER_NOTIFICATION_CHANNELS.map((channel) => (
              <option key={channel} value={channel}>
                {channel === 'ALL' ? 'All channels' : customerNotificationChannelLabel(channel)}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Sent within</span>
          <select className="ui-input" defaultValue={filters.window} name="window">
            {CUSTOMER_NOTIFICATION_WINDOWS.map((window) => (
              <option key={window} value={window}>
                {window === 'ALL' ? 'All retained history' : `${window} days`}
              </option>
            ))}
          </select>
        </label>
        <div className="business-report__filter-actions">
          <button className="ui-button ui-button--primary" type="submit">
            Apply filters
          </button>
          <Link className="ui-button ui-button--secondary" href="/account/notifications">
            Clear
          </Link>
        </div>
      </form>

      {matchingCount > CUSTOMER_NOTIFICATION_RESULT_LIMIT ? (
        <Card className="ui-card--padded">
          <strong>Showing a bounded notification history.</strong>
          <p>Refine the filters to find older updates outside the first 500 matches.</p>
        </Card>
      ) : null}

      <div className="account-trips__list">
        {deliveries.map((delivery, index) => {
          const displayStatus = customerNotificationStatus(delivery.status);
          return (
            <Card
              className="ui-card--padded"
              key={`${delivery.createdAt.toISOString()}-${delivery.template.templateKey}-${delivery.channel}-${index}`}
            >
              <div className="account-trip__topline">
                <strong>{customerNotificationTitle(delivery.template.templateKey)}</strong>
                <span>{displayStatus.label}</span>
              </div>
              <p>
                {customerNotificationChannelLabel(delivery.channel)} ·{' '}
                {displayStatus.label === 'Delivered' && delivery.deliveredAt
                  ? `Delivered ${formatDate(delivery.deliveredAt)}`
                  : `Prepared ${formatDate(delivery.createdAt)}`}
              </p>
              {displayStatus.tone === 'attention' ? (
                <p>
                  Delivery is taking longer than expected. Your booking or account record is not
                  changed by this communication delay. Contact support if you need help.
                </p>
              ) : null}
            </Card>
          );
        })}
        {deliveries.length === 0 ? (
          <Card className="account-trips__empty ui-card--padded">
            <strong>No notifications match these filters.</strong>
            <p>New account and travel updates will appear here when they are prepared.</p>
          </Card>
        ) : null}
      </div>

      <nav aria-label="Notification history pages" className="business-audit-pagination">
        {page > 1 ? (
          <Link
            className="ui-button ui-button--secondary"
            href={customerNotificationPath(activeFilters, page - 1)}
          >
            Previous page
          </Link>
        ) : (
          <span />
        )}
        <span>
          Page {page} of {pageCount}
        </span>
        {page < pageCount ? (
          <Link
            className="ui-button ui-button--secondary"
            href={customerNotificationPath(activeFilters, page + 1)}
          >
            Next page
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </section>
  );
}
