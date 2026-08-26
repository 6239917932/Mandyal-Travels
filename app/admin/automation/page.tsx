import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Prisma } from '@/generated/prisma/client';

import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import {
  ADMIN_AUTOMATION_PAGE_SIZE,
  ADMIN_AUTOMATION_RESULT_LIMIT,
  ADMIN_AUTOMATION_STATUSES,
  ADMIN_AUTOMATION_WINDOWS,
  adminAutomationPath,
  automationLeasePosture,
  automationWindowStart,
  normalizeAdminAutomationFilters,
  privateAutomationReference,
  safeAutomationSummary,
} from '@/services/adminAutomationWorkbenchService';

export const metadata: Metadata = { title: 'Autopilot operations' };

type SearchValue = string | string[] | undefined;
type Props = {
  searchParams: Promise<{ page?: SearchValue; status?: SearchValue; window?: SearchValue }>;
};

function formatDate(value: Date | null): string {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    value,
  );
}

export default async function AdminAutomationPage({ searchParams }: Props) {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/automation');
  const filters = normalizeAdminAutomationFilters(await searchParams);
  const now = new Date();
  const start = automationWindowStart(filters.window, now);
  const where: Prisma.AutomationJobRunWhereInput = {
    ...(filters.status === 'ALL' ? {} : { status: filters.status }),
    ...(start ? { startedAt: { gte: start } } : {}),
  };
  const since24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [matchingCount, failedCount, succeededCount, leases] = await Promise.all([
    prisma.automationJobRun.count({ where }),
    prisma.automationJobRun.count({ where: { status: 'FAILED' } }),
    prisma.automationJobRun.count({
      where: { startedAt: { gte: since24Hours }, status: 'SUCCEEDED' },
    }),
    prisma.automationJobLease.findMany({ orderBy: { jobKey: 'asc' }, take: 25 }),
  ]);
  const boundedCount = Math.min(matchingCount, ADMIN_AUTOMATION_RESULT_LIMIT);
  const pageCount = Math.max(1, Math.ceil(boundedCount / ADMIN_AUTOMATION_PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const runs = await prisma.automationJobRun.findMany({
    orderBy: [{ startedAt: 'desc' }, { id: 'asc' }],
    select: {
      completedAt: true,
      correlationId: true,
      failureCount: true,
      jobKey: true,
      processedCount: true,
      startedAt: true,
      status: true,
      summaryJson: true,
    },
    skip: (page - 1) * ADMIN_AUTOMATION_PAGE_SIZE,
    take: ADMIN_AUTOMATION_PAGE_SIZE,
    where,
  });
  const activeFilters = { ...filters, page };
  const activeLeaseCount = leases.filter(
    (lease) => automationLeasePosture({ ...lease, now }) === 'ACTIVE',
  ).length;

  return (
    <section className="account-page business-report admin-workspace">
      <header className="admin-hero">
        <div className="admin-hero__content">
          <p className="admin-hero__eyebrow">Lease-protected routine operations</p>
          <h1>Autopilot operations</h1>
          <p>
            Review bounded maintenance and notification-delivery runs with scheduler health. This
            console is read only and cannot capture payments, refund customers, release payouts,
            change prices, confirm bookings, or publish supplier inventory.
          </p>
          <div className="admin-hero__actions">
            <Link className="ui-button ui-button--secondary" href="/admin/audit">
              Audit workbench
            </Link>
            <Link className="ui-button ui-button--secondary" href="/admin/operations">
              Exception operations
            </Link>
            <Link className="ui-button ui-button--secondary" href="/admin">
              Operations console
            </Link>
          </div>
        </div>
      </header>

      <div className="partner-bookings__summary">
        <Card className={activeLeaseCount ? 'admin-metric--primary' : 'admin-metric--clear'}>
          <span>Active leases</span>
          <strong>{activeLeaseCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card className={failedCount ? 'admin-metric--attention' : 'admin-metric--clear'}>
          <span>Recorded failed runs</span>
          <strong>{failedCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Successful in 24 hours</span>
          <strong>{succeededCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Control posture</span>
          <strong>Read only</strong>
        </Card>
      </div>

      <div className="partner-bookings__summary">
        {leases.map((lease) => {
          const posture = automationLeasePosture({ ...lease, now });
          return (
            <Card
              className={posture === 'ATTENTION' ? 'admin-metric--attention' : ''}
              key={lease.jobKey}
            >
              <strong>{lease.jobKey.replaceAll('_', ' ')}</strong>
              <span>
                {posture} · Last state {lease.lastStatus}
              </span>
              <small>Last completed {formatDate(lease.lastCompletedAt)}</small>
            </Card>
          );
        })}
        {leases.length === 0 ? (
          <Card>
            <strong>No scheduler lease has been recorded.</strong>
          </Card>
        ) : null}
      </div>

      <form className="business-report__filters" method="get">
        <label className="ui-field">
          <span className="ui-field__label">Run status</span>
          <select className="ui-input" defaultValue={filters.status} name="status">
            {ADMIN_AUTOMATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === 'ALL' ? 'All statuses' : status}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Started within</span>
          <select className="ui-input" defaultValue={filters.window} name="window">
            {ADMIN_AUTOMATION_WINDOWS.map((window) => (
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
          <Link className="ui-button ui-button--secondary" href="/admin/automation">
            Clear
          </Link>
        </div>
      </form>

      <div className="partner-bookings__summary">
        <Card>
          <span>Matching runs</span>
          <strong>{matchingCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Disclosure boundary</span>
          <strong>Private references only</strong>
        </Card>
      </div>

      {matchingCount > ADMIN_AUTOMATION_RESULT_LIMIT ? (
        <Card className="ui-card--padded">
          <strong>Deep-history limit reached.</strong>
          <p>Refine the filters to inspect older retained runs.</p>
        </Card>
      ) : null}

      <Card className="business-report__table-card">
        <div className="business-report__table-scroll">
          <table className="business-report__table">
            <thead>
              <tr>
                <th>Run</th>
                <th>Status</th>
                <th>Safe work summary</th>
                <th>Timing</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const summary = safeAutomationSummary(run.summaryJson);
                return (
                  <tr key={run.correlationId}>
                    <td>
                      <strong>{run.jobKey.replaceAll('_', ' ')}</strong>
                      <span>Private reference {privateAutomationReference(run.correlationId)}</span>
                    </td>
                    <td>
                      <strong>{run.status}</strong>
                      <span>
                        Processed {run.processedCount} · Failures {run.failureCount}
                      </span>
                    </td>
                    <td>
                      {run.jobKey === 'NOTIFICATION_DELIVERY_V1' ? (
                        <>
                          <strong>{summary.delivered} delivered</strong>
                          <span>
                            {summary.failed} failed · {summary.deadLettered} dead-lettered
                          </span>
                        </>
                      ) : run.jobKey === 'SEARCH_PROJECTION_MAINTENANCE_V1' ? (
                        <>
                          <strong>
                            {summary.rebuilt ? `${summary.projected} projected` : 'Healthy no-op'}
                          </strong>
                          <span>
                            {summary.removed} stale removed · {summary.sourceCount} sources
                          </span>
                        </>
                      ) : (
                        <>
                          <strong>{summary.expiredBusSeatHolds} bus holds</strong>
                          <span>
                            {summary.expiredAvailabilityLocks} hotel locks ·{' '}
                            {summary.releasedPromotionClaims} promotion claims
                          </span>
                        </>
                      )}
                    </td>
                    <td>
                      <strong>Started {formatDate(run.startedAt)}</strong>
                      <span>Completed {formatDate(run.completedAt)}</span>
                    </td>
                  </tr>
                );
              })}
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={4}>No automation runs match these filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
      <nav aria-label="Autopilot run pages" className="business-audit-pagination">
        {page > 1 ? (
          <Link
            className="ui-button ui-button--secondary"
            href={adminAutomationPath(activeFilters, page - 1)}
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
            href={adminAutomationPath(activeFilters, page + 1)}
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
