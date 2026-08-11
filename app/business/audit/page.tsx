import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { prisma } from '@/lib/prisma';
import {
  BUSINESS_AUDIT_FILTER_ACTIONS,
  buildBusinessAuditWhere,
  businessAuditSearchParams,
  parseBusinessAuditFilters,
} from '@/services/businessAuditReportService';

export const metadata: Metadata = { title: 'Company audit log' };

const PAGE_SIZE = 50;

type BusinessAuditPageProps = {
  searchParams: Promise<{
    action?: string | string[];
    from?: string | string[];
    page?: string | string[];
    search?: string | string[];
    to?: string | string[];
  }>;
};

function readPage(value: string | string[] | undefined) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function actionLabel(action: string) {
  return action.replaceAll('_', ' ').toLowerCase();
}

export default async function BusinessAuditPage({ searchParams }: BusinessAuditPageProps) {
  const access = await getBusinessAdminMembership();
  if (!access) redirect('/business');

  const values = await searchParams;
  const filters = parseBusinessAuditFilters(values);
  const where = buildBusinessAuditWhere(access.membership.organizationId, filters);
  const [organization, totalEntries] = await Promise.all([
    prisma.organization.findUnique({
      select: { name: true },
      where: { id: access.membership.organizationId },
    }),
    prisma.businessAuditLog.count({ where }),
  ]);
  if (!organization) redirect('/business');

  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));
  const page = Math.min(readPage(values.page), totalPages);
  const entries = await prisma.businessAuditLog.findMany({
    include: { actor: { select: { email: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    where,
  });
  const filterQuery = businessAuditSearchParams(filters);
  const pageHref = (target: number) => {
    const params = new URLSearchParams(filterQuery);
    params.set('page', String(target));
    return `/business/audit?${params.toString()}`;
  };

  return (
    <section className="account-page business-report">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Organization governance</p>
          <h1>Company audit log</h1>
          <p>{organization.name}</p>
        </div>
        <div className="manage-booking__document-actions">
          <Link className="ui-button ui-button--secondary" href="/business/dashboard">
            Back to business workspace
          </Link>
          <a
            className="ui-button ui-button--primary"
            href={`/api/v1/business/audit/export${filterQuery.size ? `?${filterQuery.toString()}` : ''}`}
          >
            Download filtered CSV
          </a>
        </div>
      </div>

      <Card>
        <form className="business-report__filters" method="get">
          <label className="ui-field business-report__search">
            <span className="ui-field__label">Activity, person, or record</span>
            <input
              className="ui-input"
              defaultValue={filters.search}
              maxLength={100}
              name="search"
              placeholder="Search summary, person, or record"
            />
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Activity type</span>
            <select className="ui-input" defaultValue={filters.action} name="action">
              <option value="">All activities</option>
              {BUSINESS_AUDIT_FILTER_ACTIONS.map((action) => (
                <option key={action} value={action}>
                  {actionLabel(action)}
                </option>
              ))}
            </select>
          </label>
          <label className="ui-field">
            <span className="ui-field__label">From</span>
            <input className="ui-input" defaultValue={filters.from} name="from" type="date" />
          </label>
          <label className="ui-field">
            <span className="ui-field__label">To</span>
            <input className="ui-input" defaultValue={filters.to} name="to" type="date" />
          </label>
          <div className="business-report__filter-actions">
            <button className="ui-button ui-button--primary" type="submit">
              Apply filters
            </button>
            <Link className="ui-button ui-button--secondary" href="/business/audit">
              Clear
            </Link>
          </div>
        </form>
      </Card>

      <div className="partner-bookings__summary">
        <Card>
          <span>Matching activities</span>
          <strong>{totalEntries}</strong>
        </Card>
        <Card>
          <span>Page</span>
          <strong>
            {page} of {totalPages}
          </strong>
        </Card>
      </div>

      {entries.length === 0 ? (
        <Card className="account-trips__empty">
          <strong>No company activity matches these filters.</strong>
          <p>Clear the filters to view the complete organization history.</p>
        </Card>
      ) : (
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th>Date and time</th>
                  <th>Activity</th>
                  <th>Performed by</th>
                  <th>Record</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <strong>{entry.createdAt.toLocaleDateString('en-IN')}</strong>
                      <small>{entry.createdAt.toLocaleTimeString('en-IN')}</small>
                    </td>
                    <td>
                      <strong>{actionLabel(entry.action)}</strong>
                      <small>{entry.summary}</small>
                    </td>
                    <td>
                      <strong>
                        {entry.actor
                          ? `${entry.actor.firstName} ${entry.actor.lastName}`
                          : 'System'}
                      </strong>
                      {entry.actor ? <small>{entry.actor.email}</small> : null}
                    </td>
                    <td>
                      <strong>{entry.entityType.replaceAll('_', ' ').toLowerCase()}</strong>
                      <small>{entry.entityId ?? 'No record identifier'}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {totalPages > 1 ? (
        <nav aria-label="Audit log pages" className="business-audit-pagination">
          {page > 1 ? (
            <Link className="ui-button ui-button--secondary" href={pageHref(page - 1)}>
              Previous page
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link className="ui-button ui-button--secondary" href={pageHref(page + 1)}>
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
