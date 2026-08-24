import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Prisma } from '@/generated/prisma/client';

import { AdminIntegrationEventActions } from '@/components/admin/AdminOperationsQueueActions';
import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import {
  ADMIN_EXCEPTION_PAGE_SIZE,
  ADMIN_EXCEPTION_RESULT_LIMIT,
  ADMIN_EXCEPTION_STATUSES,
  ADMIN_EXCEPTION_WINDOWS,
  adminExceptionPath,
  exceptionWindowStart,
  hasIntegrationErrorEvidence,
  integrationQueuePosture,
  normalizeAdminExceptionFilters,
  privateAggregateReference,
} from '@/services/adminExceptionWorkbenchService';

export const metadata: Metadata = { title: 'Exception operations' };

type SearchValue = string | string[] | undefined;
type Props = {
  searchParams: Promise<{
    page?: SearchValue;
    q?: SearchValue;
    status?: SearchValue;
    window?: SearchValue;
  }>;
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    value,
  );
}

export default async function AdminOperationsPage({ searchParams }: Props) {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/operations');
  const filters = normalizeAdminExceptionFilters(await searchParams);
  const start = exceptionWindowStart(filters.window, new Date());
  const statusWhere =
    filters.status === 'ALL'
      ? {}
      : filters.status === 'ACTION_REQUIRED'
        ? { status: { in: ['PENDING', 'DEAD_LETTER'] } }
        : { status: filters.status };
  const where: Prisma.IntegrationOutboxEventWhereInput = {
    ...statusWhere,
    ...(start ? { createdAt: { gte: start } } : {}),
    ...(filters.query
      ? {
          OR: [
            { id: { contains: filters.query } },
            { eventType: { contains: filters.query } },
            { aggregateType: { contains: filters.query } },
            { aggregateId: { contains: filters.query } },
          ],
        }
      : {}),
  };
  const [
    matchingCount,
    actionRequiredCount,
    deadLetterCount,
    pendingAmendmentCount,
    discrepancyCount,
    pendingRefundCount,
    openRiskCount,
  ] = await Promise.all([
    prisma.integrationOutboxEvent.count({ where }),
    prisma.integrationOutboxEvent.count({
      where: { status: { in: ['PENDING', 'DEAD_LETTER'] } },
    }),
    prisma.integrationOutboxEvent.count({ where: { status: 'DEAD_LETTER' } }),
    prisma.bookingAmendment.count({ where: { status: 'pending' } }),
    prisma.paymentTransaction.count({ where: { reconciliationStatus: 'DISCREPANCY' } }),
    prisma.refundRequest.count({ where: { status: 'PENDING' } }),
    prisma.riskSignal.count({ where: { status: 'OPEN' } }),
  ]);
  const boundedCount = Math.min(matchingCount, ADMIN_EXCEPTION_RESULT_LIMIT);
  const pageCount = Math.max(1, Math.ceil(boundedCount / ADMIN_EXCEPTION_PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const events = await prisma.integrationOutboxEvent.findMany({
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      _count: { select: { reviewEvents: true } },
      aggregateId: true,
      aggregateType: true,
      attempts: true,
      createdAt: true,
      eventType: true,
      id: true,
      lastError: true,
      maxAttempts: true,
      nextAttemptAt: true,
      reviewEvents: {
        orderBy: { createdAt: 'desc' },
        select: { action: true, createdAt: true },
        take: 1,
      },
      status: true,
      updatedAt: true,
    },
    skip: (page - 1) * ADMIN_EXCEPTION_PAGE_SIZE,
    take: ADMIN_EXCEPTION_PAGE_SIZE,
    where,
  });
  const activeFilters = { ...filters, page };

  return (
    <section className="account-page business-report admin-workspace">
      <header className="admin-hero">
        <div className="admin-hero__content">
          <p className="admin-hero__eyebrow">Human-governed operational queues</p>
          <h1>Exception operations</h1>
          <p>
            Triage supplier delivery failures and hand off booking, finance, refund, and risk work
            without exposing payloads, raw identifiers, provider errors, or customer data.
          </p>
          <div className="admin-hero__actions">
            <Link className="ui-button ui-button--secondary" href="/admin/audit">
              Audit workbench
            </Link>
            <Link className="ui-button ui-button--secondary" href="/admin/integrations">
              Integration registry
            </Link>
            <Link className="ui-button ui-button--secondary" href="/admin">
              Back to operations
            </Link>
          </div>
        </div>
      </header>

      <div className="partner-bookings__summary">
        <Card className={actionRequiredCount ? 'admin-metric--attention' : 'admin-metric--clear'}>
          <span>Integration action required</span>
          <strong>{actionRequiredCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card className={deadLetterCount ? 'admin-metric--attention' : 'admin-metric--clear'}>
          <span>Dead-letter events</span>
          <strong>{deadLetterCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card className={pendingAmendmentCount ? 'admin-metric--attention' : 'admin-metric--clear'}>
          <span>Pending amendments</span>
          <strong>{pendingAmendmentCount.toLocaleString('en-IN')}</strong>
          <Link href="/admin/bookings?status=CONFIRMED">Open bookings</Link>
        </Card>
        <Card className={discrepancyCount ? 'admin-metric--attention' : 'admin-metric--clear'}>
          <span>Payment discrepancies</span>
          <strong>{discrepancyCount.toLocaleString('en-IN')}</strong>
          <Link href="/admin/finance?reconciliation=DISCREPANCY">Open finance</Link>
        </Card>
        <Card className={pendingRefundCount ? 'admin-metric--attention' : 'admin-metric--clear'}>
          <span>Pending refunds</span>
          <strong>{pendingRefundCount.toLocaleString('en-IN')}</strong>
          <Link href="/admin/finance?refundStatus=PENDING">Open refunds</Link>
        </Card>
        <Card className={openRiskCount ? 'admin-metric--attention' : 'admin-metric--clear'}>
          <span>Open risk reviews</span>
          <strong>{openRiskCount.toLocaleString('en-IN')}</strong>
          <Link href="/admin/risk">Open risk workbench</Link>
        </Card>
      </div>

      <form className="business-report__filters" method="get">
        <label className="ui-field business-report__search">
          <span className="ui-field__label">
            Event, aggregate type, or exact internal reference
          </span>
          <input
            className="ui-input"
            defaultValue={filters.query}
            maxLength={100}
            name="q"
            placeholder="Event type, aggregate type, or exact ID"
            type="search"
          />
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Status</span>
          <select className="ui-input" defaultValue={filters.status} name="status">
            {ADMIN_EXCEPTION_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item === 'ALL' ? 'All statuses' : item.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Created within</span>
          <select className="ui-input" defaultValue={filters.window} name="window">
            {ADMIN_EXCEPTION_WINDOWS.map((item) => (
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
          <Link className="ui-button ui-button--secondary" href="/admin/operations">
            Clear
          </Link>
        </div>
      </form>

      <div className="partner-bookings__summary">
        <Card>
          <span>Matching integration events</span>
          <strong>{matchingCount.toLocaleString('en-IN')}</strong>
        </Card>
      </div>

      {matchingCount > ADMIN_EXCEPTION_RESULT_LIMIT ? (
        <Card className="ui-card--padded">
          <strong>Deep-history limit reached.</strong>
          <p>
            Refine the filters to review records beyond the first{' '}
            {ADMIN_EXCEPTION_RESULT_LIMIT.toLocaleString('en-IN')} matches.
          </p>
        </Card>
      ) : null}

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Supplier and channel delivery</p>
          <h2>Integration exception history</h2>
        </div>
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Private aggregate</th>
                  <th>Queue posture</th>
                  <th>Evidence</th>
                  <th>Review history</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const review = event.reviewEvents[0];
                  return (
                    <tr key={event.id}>
                      <td>
                        <strong>{event.eventType}</strong>
                        <span>{formatDate(event.createdAt)}</span>
                      </td>
                      <td>
                        <strong>{event.aggregateType}</strong>
                        <span>
                          {privateAggregateReference(event.aggregateType, event.aggregateId)}
                        </span>
                      </td>
                      <td>
                        <strong>{event.status}</strong>
                        <span>{integrationQueuePosture(event.status, event.attempts)}</span>
                        <span>
                          Attempt {event.attempts} of {event.maxAttempts}
                        </span>
                      </td>
                      <td>
                        <strong>
                          {hasIntegrationErrorEvidence(event.lastError)
                            ? 'Error evidence recorded'
                            : 'No error evidence'}
                        </strong>
                        {event.status === 'PENDING' ? (
                          <span>Next attempt {formatDate(event.nextAttemptAt)}</span>
                        ) : null}
                      </td>
                      <td>
                        {review ? (
                          <>
                            <strong>{review.action}</strong>
                            <span>
                              {event._count.reviewEvents.toLocaleString('en-IN')} recorded action
                              {event._count.reviewEvents === 1 ? '' : 's'} · latest{' '}
                              {formatDate(review.createdAt)}
                            </span>
                          </>
                        ) : (
                          <span>No human action recorded</span>
                        )}
                      </td>
                      <td>
                        {['PENDING', 'DEAD_LETTER'].includes(event.status) ? (
                          <AdminIntegrationEventActions
                            eventId={event.id}
                            expectedUpdatedAt={event.updatedAt.toISOString()}
                          />
                        ) : (
                          <span>Read-only history</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No integration events match these filters.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
        <nav aria-label="Integration exception pages" className="business-audit-pagination">
          {page > 1 ? (
            <Link
              className="ui-button ui-button--secondary"
              href={adminExceptionPath(activeFilters, page - 1)}
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
              href={adminExceptionPath(activeFilters, page + 1)}
            >
              Next page
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </section>
  );
}
