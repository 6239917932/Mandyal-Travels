import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { BusinessRequestCheckoutLink } from '@/components/business/BusinessRequestCheckoutLink';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'My company travel requests' };

const PAGE_SIZE = 25;
const REQUEST_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'BOOKED'] as const;

type CompanyRequestsPageProps = {
  searchParams: Promise<{ page?: string | string[]; status?: string | string[] }>;
};

function readValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim().toUpperCase() ?? '';
}

function readPage(value: string | string[] | undefined) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function isBusinessProduct(value: string): value is 'BUS' | 'CAR' | 'FLIGHT' | 'HOTEL' {
  return ['BUS', 'CAR', 'FLIGHT', 'HOTEL'].includes(value);
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default async function CompanyRequestsPage({ searchParams }: CompanyRequestsPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=%2Faccount%2Fcompany-requests');

  const membership = await prisma.organizationMember.findUnique({
    include: { organization: { select: { name: true } } },
    where: { userId: user.id },
  });
  if (!membership) redirect('/account');

  const values = await searchParams;
  const requestedStatus = readValue(values.status);
  const status = REQUEST_STATUSES.includes(requestedStatus as (typeof REQUEST_STATUSES)[number])
    ? requestedStatus
    : '';
  const where = {
    organizationId: membership.organizationId,
    requesterId: user.id,
    ...(status ? { status } : {}),
  };
  const totalRequests = await prisma.businessTravelRequest.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalRequests / PAGE_SIZE));
  const page = Math.min(readPage(values.page), totalPages);
  const requests = await prisma.businessTravelRequest.findMany({
    include: {
      customerTrip: { select: { confirmationCode: true } },
      hotelBooking: { select: { confirmationCode: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    where,
  });
  const statusQuery = status ? `&status=${status}` : '';

  return (
    <section className="account-page">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Company travel</p>
          <h1>My organization requests</h1>
          <p>{membership.organization.name}</p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/account#company-travel-request">
          Back to my account
        </Link>
      </div>

      <Card>
        <form className="business-report__filters" method="get">
          <label className="ui-field">
            <span className="ui-field__label">Request status</span>
            <select className="ui-input" defaultValue={status} name="status">
              <option value="">All statuses</option>
              {REQUEST_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <div className="business-report__filter-actions">
            <button className="ui-button ui-button--primary" type="submit">
              Apply filter
            </button>
            <Link className="ui-button ui-button--secondary" href="/account/company-requests">
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
          <span>Page</span>
          <strong>
            {page} of {totalPages}
          </strong>
        </Card>
      </div>

      {requests.length === 0 ? (
        <Card className="account-trips__empty">
          <strong>No company requests match this filter.</strong>
          <p>Create a new organization trip request from your account.</p>
        </Card>
      ) : (
        <div className="account-trips__list">
          {requests.map((request) => {
            const reference =
              request.customerTrip?.confirmationCode ??
              request.hotelBooking?.confirmationCode ??
              null;
            return (
              <Card className="account-trip" key={request.id}>
                <div className="account-trip__topline">
                  <span className="account-trip__type">{request.productType}</span>
                  <strong
                    className={`business-request__status business-request__status--${request.status.toLowerCase()}`}
                  >
                    {request.status}
                  </strong>
                </div>
                <div className="account-trip__body">
                  <div>
                    <h2>{request.title}</h2>
                    <p>{request.policyReason}</p>
                    {request.reviewNote ? (
                      <small>Administrator note: {request.reviewNote}</small>
                    ) : null}
                  </div>
                  <dl>
                    <div>
                      <dt>Travel dates</dt>
                      <dd>
                        {request.startDate}
                        {request.endDate ? ` to ${request.endDate}` : ''}
                      </dd>
                    </div>
                    <div>
                      <dt>Estimated amount</dt>
                      <dd>{formatCurrency(request.estimatedAmount, request.currency)}</dd>
                    </div>
                    <div>
                      <dt>Booking reference</dt>
                      <dd>{reference ?? 'Not booked'}</dd>
                    </div>
                  </dl>
                </div>
                <div className="account-trip__actions">
                  {request.status === 'APPROVED' && isBusinessProduct(request.productType) ? (
                    <BusinessRequestCheckoutLink
                      id={request.id}
                      organizationName={membership.organization.name}
                      productType={request.productType}
                      title={request.title}
                    />
                  ) : null}
                  <Link
                    className="ui-button ui-button--secondary"
                    href={`/business/requests/${request.id}`}
                  >
                    View request record
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 ? (
        <nav aria-label="Company request pages" className="business-audit-pagination">
          {page > 1 ? (
            <Link
              className="ui-button ui-button--secondary"
              href={`/account/company-requests?page=${page - 1}${statusQuery}`}
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
              href={`/account/company-requests?page=${page + 1}${statusQuery}`}
            >
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
