import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Prisma } from '@/generated/prisma/client';

import {
  AdminNotificationRetryButton,
  AdminNotificationTemplateManager,
} from '@/components/admin/AdminNotificationManager';
import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import {
  ADMIN_NOTIFICATION_CHANNELS,
  ADMIN_NOTIFICATION_PAGE_SIZE,
  ADMIN_NOTIFICATION_RESULT_LIMIT,
  ADMIN_NOTIFICATION_STATUSES,
  ADMIN_NOTIFICATION_WINDOWS,
  adminNotificationPath,
  hasNotificationErrorEvidence,
  normalizeAdminNotificationFilters,
  notificationDeliveryPosture,
  notificationWindowStart,
  privateRecipientReference,
} from '@/services/adminNotificationOperationsService';

export const metadata: Metadata = { title: 'Notification operations' };

type SearchValue = string | string[] | undefined;
type Props = {
  searchParams: Promise<{
    channel?: SearchValue;
    page?: SearchValue;
    q?: SearchValue;
    status?: SearchValue;
    window?: SearchValue;
  }>;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    value,
  );
}

export default async function AdminNotificationsPage({ searchParams }: Props) {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/notifications');

  const filters = normalizeAdminNotificationFilters(await searchParams);
  const now = new Date();
  const start = notificationWindowStart(filters.window, now);
  const where: Prisma.NotificationDeliveryWhereInput = {
    ...(filters.status === 'ALL' ? {} : { status: filters.status }),
    ...(filters.channel === 'ALL' ? {} : { channel: filters.channel }),
    ...(start ? { createdAt: { gte: start } } : {}),
    ...(filters.query
      ? {
          OR: [
            { id: { contains: filters.query } },
            { recipient: { contains: filters.query } },
            { template: { is: { templateKey: { contains: filters.query } } } },
          ],
        }
      : {}),
  };
  const staleProcessingAt = new Date(now.getTime() - 15 * 60 * 1000);
  const deliveredSince = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [templates, matchingCount, queuedCount, attentionCount, staleCount, deliveredCount] =
    await Promise.all([
      prisma.notificationTemplate.findMany({ orderBy: { updatedAt: 'desc' }, take: 100 }),
      prisma.notificationDelivery.count({ where }),
      prisma.notificationDelivery.count({ where: { status: 'QUEUED' } }),
      prisma.notificationDelivery.count({ where: { status: { in: ['FAILED', 'DEAD_LETTER'] } } }),
      prisma.notificationDelivery.count({
        where: { status: 'PROCESSING', updatedAt: { lte: staleProcessingAt } },
      }),
      prisma.notificationDelivery.count({
        where: { deliveredAt: { gte: deliveredSince }, status: 'DELIVERED' },
      }),
    ]);
  const boundedCount = Math.min(matchingCount, ADMIN_NOTIFICATION_RESULT_LIMIT);
  const pageCount = Math.max(1, Math.ceil(boundedCount / ADMIN_NOTIFICATION_PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const deliveries = await prisma.notificationDelivery.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    select: {
      attempts: true,
      channel: true,
      createdAt: true,
      deliveredAt: true,
      id: true,
      lastError: true,
      maxAttempts: true,
      nextAttemptAt: true,
      providerRef: true,
      recipient: true,
      status: true,
      template: { select: { templateKey: true } },
      updatedAt: true,
    },
    skip: (page - 1) * ADMIN_NOTIFICATION_PAGE_SIZE,
    take: ADMIN_NOTIFICATION_PAGE_SIZE,
    where,
  });
  const activeFilters = { ...filters, page };

  return (
    <section className="account-page business-report admin-workspace">
      <header className="admin-hero">
        <div className="admin-hero__content">
          <p className="admin-hero__eyebrow">Provider-ready communications</p>
          <h1>Notification operations</h1>
          <p>
            Version governed templates, review delivery posture, and safely requeue failed messages
            without exposing recipients, provider references, or error contents.
          </p>
          <div className="admin-hero__actions">
            <Link className="ui-button ui-button--secondary" href="/admin/integrations">
              Integration registry
            </Link>
            <Link className="ui-button ui-button--secondary" href="/admin">
              Operations console
            </Link>
          </div>
        </div>
      </header>

      <div className="partner-bookings__summary">
        <Card>
          <span>Queued</span>
          <strong>{queuedCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card className={attentionCount ? 'admin-metric admin-metric--attention' : 'admin-metric'}>
          <span>Failed or dead-letter</span>
          <strong>{attentionCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card className={staleCount ? 'admin-metric admin-metric--attention' : 'admin-metric'}>
          <span>Stale processing leases</span>
          <strong>{staleCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Delivered in 24 hours</span>
          <strong>{deliveredCount.toLocaleString('en-IN')}</strong>
        </Card>
      </div>

      <div className="partner-bookings__summary">
        {templates.map((template) => (
          <Card key={template.id}>
            <strong>{template.templateKey}</strong>
            <span>
              {template.channel} · v{template.version} · {template.status}
            </span>
          </Card>
        ))}
        {templates.length === 0 ? (
          <Card>
            <strong>No notification templates exist.</strong>
          </Card>
        ) : null}
      </div>

      <AdminNotificationTemplateManager />

      <form className="business-report__filters" method="get">
        <label className="ui-field business-report__search">
          <span className="ui-field__label">Delivery or recipient lookup</span>
          <input
            className="ui-input"
            defaultValue={filters.query}
            maxLength={100}
            name="q"
            placeholder="Template key, exact delivery, or recipient"
            type="search"
          />
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Status</span>
          <select className="ui-input" defaultValue={filters.status} name="status">
            {ADMIN_NOTIFICATION_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item === 'ALL' ? 'All statuses' : item.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Channel</span>
          <select className="ui-input" defaultValue={filters.channel} name="channel">
            {ADMIN_NOTIFICATION_CHANNELS.map((item) => (
              <option key={item} value={item}>
                {item === 'ALL' ? 'All channels' : item}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Created within</span>
          <select className="ui-input" defaultValue={filters.window} name="window">
            {ADMIN_NOTIFICATION_WINDOWS.map((item) => (
              <option key={item} value={item}>
                {item === 'ALL' ? 'All retained history' : `${item} days`}
              </option>
            ))}
          </select>
        </label>
        <div className="business-report__filter-actions">
          <button className="ui-button ui-button--primary" type="submit">
            Apply filters
          </button>
          <Link className="ui-button ui-button--secondary" href="/admin/notifications">
            Clear
          </Link>
        </div>
      </form>

      <div className="partner-bookings__summary">
        <Card>
          <span>Matching deliveries</span>
          <strong>{matchingCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Disclosure boundary</span>
          <strong>Private references only</strong>
        </Card>
      </div>

      {matchingCount > ADMIN_NOTIFICATION_RESULT_LIMIT ? (
        <Card className="ui-card--padded">
          <strong>Deep-history limit reached.</strong>
          <p>
            Refine the filters to review records beyond the first{' '}
            {ADMIN_NOTIFICATION_RESULT_LIMIT.toLocaleString('en-IN')} matches.
          </p>
        </Card>
      ) : null}

      <div className="account-trips__list">
        {deliveries.map((delivery) => {
          const posture = notificationDeliveryPosture({ ...delivery, now });
          return (
            <Card className="ui-card--padded" key={delivery.id}>
              <div className="account-trip__topline">
                <strong>
                  {delivery.template.templateKey} · {delivery.channel} · {delivery.status}
                </strong>
                <span>{posture.replaceAll('_', ' ')}</span>
              </div>
              <p>
                Private recipient reference{' '}
                {privateRecipientReference(delivery.channel, delivery.recipient)} · Created{' '}
                {formatDate(delivery.createdAt)}
              </p>
              <p>
                Attempts {delivery.attempts} of {delivery.maxAttempts} ·{' '}
                {delivery.status === 'DELIVERED' && delivery.deliveredAt
                  ? `Delivered ${formatDate(delivery.deliveredAt)}`
                  : `Next eligible ${formatDate(delivery.nextAttemptAt)}`}
              </p>
              <p>
                Provider acknowledgement: {delivery.providerRef ? 'Recorded' : 'Not recorded'} ·
                Error evidence:{' '}
                {hasNotificationErrorEvidence(delivery.lastError) ? 'Recorded' : 'None'}
              </p>
              {['FAILED', 'DEAD_LETTER'].includes(delivery.status) ? (
                <AdminNotificationRetryButton deliveryId={delivery.id} />
              ) : null}
            </Card>
          );
        })}
        {deliveries.length === 0 ? (
          <Card className="ui-card--padded">
            <strong>No notification deliveries match these filters.</strong>
            <p>
              Queued messages are never represented as delivered without provider acknowledgement.
            </p>
          </Card>
        ) : null}
      </div>

      <nav aria-label="Notification delivery pages" className="business-audit-pagination">
        {page > 1 ? (
          <Link
            className="ui-button ui-button--secondary"
            href={adminNotificationPath(activeFilters, page - 1)}
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
            href={adminNotificationPath(activeFilters, page + 1)}
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
