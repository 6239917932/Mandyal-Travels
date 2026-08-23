import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getAgencyAdminAccess } from '@/lib/agentAuth';
import { prisma } from '@/lib/prisma';
import {
  AGENCY_REPORT_PRODUCTS,
  AGENCY_REPORT_STATUSES,
  agencyReportSearchParams,
  buildAgencyReportWhere,
  parseAgencyReportFilters,
} from '@/services/agencyReportService';

export const metadata: Metadata = { title: 'Agency customer report' };

const PAGE_SIZE = 50;

type AgencyReportsPageProps = {
  searchParams: Promise<{
    customer?: string | string[];
    from?: string | string[];
    page?: string | string[];
    product?: string | string[];
    search?: string | string[];
    status?: string | string[];
    to?: string | string[];
  }>;
};

function readPage(value: string | string[] | undefined) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function formatCurrency(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default async function AgencyReportsPage({ searchParams }: AgencyReportsPageProps) {
  const access = await getAgencyAdminAccess();
  if (!access) redirect('/business');

  const values = await searchParams;
  const filters = parseAgencyReportFilters(values);
  const where = buildAgencyReportWhere(access.membership.organizationId, filters);
  const [customers, totalRequests, pendingCount, bookedCount, bookedValueResult] =
    await Promise.all([
      prisma.agencyCustomer.findMany({
        orderBy: [{ displayName: 'asc' }, { email: 'asc' }],
        select: { displayName: true, email: true, id: true, status: true },
        where: { organizationId: access.membership.organizationId },
      }),
      prisma.businessTravelRequest.count({ where }),
      prisma.businessTravelRequest.count({ where: { AND: [where, { status: 'PENDING' }] } }),
      prisma.businessTravelRequest.count({ where: { AND: [where, { status: 'BOOKED' }] } }),
      prisma.businessTravelRequest.aggregate({
        _sum: { bookingTotalAmount: true },
        where: { AND: [where, { currency: 'INR', status: 'BOOKED' }] },
      }),
    ]);

  const totalPages = Math.max(1, Math.ceil(totalRequests / PAGE_SIZE));
  const page = Math.min(readPage(values.page), totalPages);
  const requests = await prisma.businessTravelRequest.findMany({
    include: {
      agencyCustomerLink: { include: { agencyCustomer: true } },
      customerTrip: { select: { confirmationCode: true } },
      hotelBooking: { select: { confirmationCode: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    where,
  });
  const filterParams = agencyReportSearchParams(filters);
  const exportQuery = filterParams.toString();
  const pageHref = (target: number) => {
    const params = new URLSearchParams(filterParams);
    params.set('page', String(target));
    return `/agent/reports?${params.toString()}`;
  };

  return (
    <section className="account-page business-report">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">B2B customer reporting</p>
          <h1>Agency customer report</h1>
          <p>{access.organization.name}</p>
        </div>
        <div className="manage-booking__document-actions">
          <Link className="ui-button ui-button--secondary" href="/agent">
            Back to agent workspace
          </Link>
          <a
            className="ui-button ui-button--primary"
            href={`/api/v1/agent/reports/export${exportQuery ? `?${exportQuery}` : ''}`}
          >
            Download filtered CSV
          </a>
        </div>
      </div>

      <Card>
        <form className="business-report__filters" method="get">
          <label className="ui-field business-report__search">
            <span className="ui-field__label">Customer or request</span>
            <input
              className="ui-input"
              defaultValue={filters.search}
              maxLength={100}
              name="search"
              placeholder="Name, email, phone, destination, or purpose"
            />
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Customer</span>
            <select className="ui-input" defaultValue={filters.customer} name="customer">
              <option value="">All customers</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.displayName} ({customer.status.toLowerCase()})
                </option>
              ))}
            </select>
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Product</span>
            <select className="ui-input" defaultValue={filters.product} name="product">
              <option value="">All products</option>
              {AGENCY_REPORT_PRODUCTS.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </select>
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Status</span>
            <select className="ui-input" defaultValue={filters.status} name="status">
              <option value="">All statuses</option>
              {AGENCY_REPORT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Travel from</span>
            <input className="ui-input" defaultValue={filters.from} name="from" type="date" />
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Travel to</span>
            <input className="ui-input" defaultValue={filters.to} name="to" type="date" />
          </label>
          <div className="business-report__filter-actions">
            <button className="ui-button ui-button--primary" type="submit">
              Apply filters
            </button>
            <Link className="ui-button ui-button--secondary" href="/agent/reports">
              Clear
            </Link>
          </div>
        </form>
      </Card>

      <div className="partner-bookings__summary">
        <Card>
          <span>Matching requests</span>
          <strong>{totalRequests}</strong>
        </Card>
        <Card>
          <span>Pending approvals</span>
          <strong>{pendingCount}</strong>
        </Card>
        <Card>
          <span>Confirmed journeys</span>
          <strong>{bookedCount}</strong>
        </Card>
        <Card>
          <span>Booked value (INR)</span>
          <strong>{formatCurrency(bookedValueResult._sum.bookingTotalAmount ?? 0)}</strong>
        </Card>
      </div>

      {requests.length === 0 ? (
        <Card className="account-trips__empty">
          <strong>No agency customer requests match these filters.</strong>
          <p>Clear the filters or create a customer-attributed request in the agent workspace.</p>
        </Card>
      ) : (
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Agency customer</th>
                  <th>Travel</th>
                  <th>Amount</th>
                  <th>Status and reference</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => {
                  const customer = request.agencyCustomerLink?.agencyCustomer;
                  const reference =
                    request.customerTrip?.confirmationCode ??
                    request.hotelBooking?.confirmationCode ??
                    '';
                  return (
                    <tr key={request.id}>
                      <td>
                        <span className="account-trip__type">{request.productType}</span>
                        <strong>{request.title}</strong>
                        <small>Created {request.createdAt.toLocaleDateString('en-IN')}</small>
                      </td>
                      <td>
                        <strong>{customer?.displayName ?? 'Customer record unavailable'}</strong>
                        <small>{customer?.email ?? '—'}</small>
                        {customer?.phone ? <small>{customer.phone}</small> : null}
                      </td>
                      <td>
                        <strong>{request.startDate}</strong>
                        <small>{request.endDate ? `to ${request.endDate}` : 'Single date'}</small>
                      </td>
                      <td>
                        <strong>{formatCurrency(request.estimatedAmount, request.currency)}</strong>
                        <small>
                          {request.bookingTotalAmount === null
                            ? 'Estimated'
                            : `${formatCurrency(request.bookingTotalAmount, request.currency)} booked`}
                        </small>
                      </td>
                      <td>
                        <strong
                          className={`business-request__status business-request__status--${request.status.toLowerCase()}`}
                        >
                          {request.status}
                        </strong>
                        {reference ? <small>{reference}</small> : null}
                        {request.status === 'BOOKED' ? (
                          <Link href={`/business/statements/${request.id}`}>View statement</Link>
                        ) : null}
                        <Link href={`/business/requests/${request.id}`}>View request record</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {totalPages > 1 ? (
        <nav aria-label="Agency customer report pages" className="business-audit-pagination">
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
