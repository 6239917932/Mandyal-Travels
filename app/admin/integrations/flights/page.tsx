import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import type { Prisma } from '@/generated/prisma/client';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import {
  ADMIN_FLIGHT_OPERATION_PAGE_SIZE,
  ADMIN_FLIGHT_OPERATION_RESULT_LIMIT,
  adminFlightOperationPath,
  flightOperationPosture,
  hasOperationEvidence,
  normalizeAdminFlightOperationFilters,
} from '@/services/adminFlightOperationLedgerService';

export const metadata: Metadata = { title: 'Flight supplier operation ledger' };

type PageProps = {
  searchParams: Promise<{
    environment?: string | string[];
    page?: string | string[];
    q?: string | string[];
    status?: string | string[];
  }>;
};

function dateLabel(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
    : 'Not completed';
}

function label(value: string) {
  return value.replaceAll('_', ' ').toLowerCase();
}

export default async function AdminFlightOperationsPage({ searchParams }: PageProps) {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/integrations/flights');
  const filters = normalizeAdminFlightOperationFilters(await searchParams);
  const where: Prisma.FlightSupplierOperationWhereInput = {
    ...(filters.environment === 'ALL' ? {} : { connection: { environment: filters.environment } }),
    ...(filters.query
      ? {
          OR: [
            { connection: { displayName: { contains: filters.query } } },
            { connection: { providerCode: { contains: filters.query } } },
            { connection: { partner: { name: { contains: filters.query } } } },
            { correlationId: { contains: filters.query } },
          ],
        }
      : {}),
    ...(filters.status === 'ALL' ? {} : { status: filters.status }),
  };
  const total = await prisma.flightSupplierOperation.count({ where });
  const overLimit = total > ADMIN_FLIGHT_OPERATION_RESULT_LIMIT;
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_FLIGHT_OPERATION_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const [operations, statusGroups] = overLimit
    ? [[], []]
    : await Promise.all([
        prisma.flightSupplierOperation.findMany({
          include: {
            connection: {
              include: { partner: { select: { id: true, name: true } } },
            },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * ADMIN_FLIGHT_OPERATION_PAGE_SIZE,
          take: ADMIN_FLIGHT_OPERATION_PAGE_SIZE,
          where,
        }),
        prisma.flightSupplierOperation.groupBy({
          by: ['status'],
          _count: { _all: true },
          orderBy: { status: 'asc' },
          where,
        }),
      ]);

  return (
    <section className="account-page business-report admin-workspace">
      <header className="admin-hero">
        <div>
          <p className="admin-hero__eyebrow">Protected supplier trace</p>
          <h1>Flight supplier operation ledger</h1>
          <p>
            Inspect queued health checks, retries, terminal status, and evidence presence without
            revealing request hashes, provider references, error payloads, or credentials.
          </p>
        </div>
        <div className="manage-booking__document-actions">
          <Link className="ui-button ui-button--secondary" href="/admin/integrations">
            Integration registry
          </Link>
          <Link className="ui-button ui-button--secondary" href="/admin">
            Operations console
          </Link>
        </div>
      </header>

      <Card>
        <strong>Provider activation remains required</strong>
        <p>
          Queued health checks are expected until a contracted flight supplier is certified and its
          worker is activated. This ledger performs no network request or automatic retry.
        </p>
      </Card>

      <form className="business-report__filters" method="get">
        <div className="ui-field business-report__search">
          <label className="ui-field__label" htmlFor="flight-operation-search">
            Supplier, provider code, partner, or correlation ID
          </label>
          <input
            className="ui-input"
            defaultValue={filters.query}
            id="flight-operation-search"
            maxLength={100}
            name="q"
            type="search"
          />
        </div>
        <label className="ui-field">
          <span className="ui-field__label">Status</span>
          <select className="ui-input" defaultValue={filters.status} name="status">
            <option value="ALL">All statuses</option>
            <option value="QUEUED">Queued</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="DEAD_LETTER">Dead letter</option>
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Environment</span>
          <select className="ui-input" defaultValue={filters.environment} name="environment">
            <option value="ALL">All environments</option>
            <option value="SANDBOX">Sandbox</option>
            <option value="PRODUCTION">Production</option>
          </select>
        </label>
        <div className="business-report__filter-actions">
          <button className="ui-button ui-button--primary" type="submit">
            Apply filters
          </button>
          <Link className="ui-button ui-button--secondary" href="/admin/integrations/flights">
            Clear
          </Link>
        </div>
      </form>

      {overLimit ? (
        <Card className="admin-empty-state">
          This query matches {total.toLocaleString('en-IN')} operations. Narrow the supplier,
          environment, or status filters to no more than{' '}
          {ADMIN_FLIGHT_OPERATION_RESULT_LIMIT.toLocaleString('en-IN')} records.
        </Card>
      ) : (
        <>
          <div className="partner-bookings__summary">
            <Card>
              <span>Filtered operations</span>
              <strong>{total.toLocaleString('en-IN')}</strong>
            </Card>
            {statusGroups.map((group) => (
              <Card key={group.status}>
                <span>{label(group.status)}</span>
                <strong>{group._count._all.toLocaleString('en-IN')}</strong>
              </Card>
            ))}
          </div>

          <Card className="business-report__table-card">
            <div className="business-report__table-scroll">
              <table className="business-report__table">
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Operation</th>
                    <th>Status</th>
                    <th>Attempts</th>
                    <th>Evidence</th>
                    <th>Timing</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.map((operation) => (
                    <tr key={operation.id}>
                      <td>
                        <strong>{operation.connection.displayName}</strong>
                        <span>
                          {operation.connection.providerCode} · {operation.connection.environment}
                        </span>
                        <Link href={`/admin/partners/${operation.connection.partner.id}`}>
                          {operation.connection.partner.name}
                        </Link>
                      </td>
                      <td>
                        <strong>{label(operation.operationType)}</strong>
                        <span>Correlation: {operation.correlationId}</span>
                      </td>
                      <td>
                        <span className="admin-status-badge">
                          {label(flightOperationPosture(operation.status, operation.attempts))}
                        </span>
                        <span>{label(operation.status)}</span>
                      </td>
                      <td>
                        <strong>{operation.attempts}</strong>
                        <span>Next eligible: {dateLabel(operation.nextAttemptAt)}</span>
                      </td>
                      <td>
                        <span>
                          Provider acknowledgement:{' '}
                          {hasOperationEvidence(operation.providerRef)
                            ? 'recorded'
                            : 'not recorded'}
                        </span>
                        <span>
                          Error evidence:{' '}
                          {hasOperationEvidence(operation.lastError) ? 'recorded' : 'not recorded'}
                        </span>
                      </td>
                      <td>
                        <span>Created: {dateLabel(operation.createdAt)}</span>
                        <span>Completed: {dateLabel(operation.completedAt)}</span>
                      </td>
                    </tr>
                  ))}
                  {operations.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No flight supplier operations match these filters.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>

          <nav aria-label="Flight supplier operation pages" className="business-audit-pagination">
            {page > 1 ? (
              <Link
                className="ui-button ui-button--secondary"
                href={adminFlightOperationPath(filters, page - 1)}
              >
                Previous page
              </Link>
            ) : (
              <span />
            )}
            <span>
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                className="ui-button ui-button--secondary"
                href={adminFlightOperationPath(filters, page + 1)}
              >
                Next page
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </>
      )}
    </section>
  );
}
