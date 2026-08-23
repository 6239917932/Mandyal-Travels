import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { CustomerSupportCenter } from '@/components/account/CustomerSupportCenter';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { normalizeCustomerSupportPrefill } from '@/services/customerTripServicingService';

export const metadata: Metadata = { title: 'Customer support' };

const PAGE_SIZE = 25;
const SUPPORT_STATUSES = new Set(['ALL', 'OPEN', 'CLOSED']);

type CustomerSupportPageProps = {
  searchParams: Promise<{
    bookingReference?: string | string[];
    category?: string | string[];
    message?: string | string[];
    page?: string | string[];
    status?: string | string[];
    subject?: string | string[];
  }>;
};

function readPage(value: string | string[] | undefined) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function readStatus(value: string | string[] | undefined) {
  const status = (Array.isArray(value) ? value[0] : value)?.toUpperCase() ?? 'ALL';
  return SUPPORT_STATUSES.has(status) ? status : 'ALL';
}

function pagePath(page: number, status: string) {
  const query = new URLSearchParams({ page: String(page) });
  if (status !== 'ALL') query.set('status', status);
  return `/account/support?${query.toString()}`;
}

export default async function CustomerSupportPage({ searchParams }: CustomerSupportPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/account/support');

  const values = await searchParams;
  const status = readStatus(values.status);
  const initialRequest = normalizeCustomerSupportPrefill(values);
  const where = { userId: user.id, ...(status === 'ALL' ? {} : { status }) };
  const [totalCases, openCases, closedCases] = await Promise.all([
    prisma.customerSupportCase.count({ where }),
    prisma.customerSupportCase.count({ where: { status: 'OPEN', userId: user.id } }),
    prisma.customerSupportCase.count({ where: { status: 'CLOSED', userId: user.id } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCases / PAGE_SIZE));
  const page = Math.min(readPage(values.page), totalPages);
  const supportCases = await prisma.customerSupportCase.findMany({
    orderBy: { updatedAt: 'desc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    where,
  });

  return (
    <section className="account-page">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Help and servicing</p>
          <h1>Customer support</h1>
          <p>Create a booking-linked case and track updates from Mandyal operations.</p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/account">
          Back to my account
        </Link>
      </div>

      <div className="partner-bookings__summary">
        <Card>
          <span>Open cases</span>
          <strong>{openCases}</strong>
        </Card>
        <Card>
          <span>Closed cases</span>
          <strong>{closedCases}</strong>
        </Card>
        <Card>
          <span>Page</span>
          <strong>
            {page} of {totalPages}
          </strong>
        </Card>
      </div>

      <nav aria-label="Customer support case filters" className="business-report__filters">
        {['ALL', 'OPEN', 'CLOSED'].map((filter) => (
          <Link
            aria-current={status === filter ? 'page' : undefined}
            className={`ui-button ${status === filter ? 'ui-button--primary' : 'ui-button--secondary'}`}
            href={pagePath(1, filter)}
            key={filter}
          >
            {filter === 'ALL' ? 'All cases' : `${filter.toLowerCase()} cases`}
          </Link>
        ))}
      </nav>

      <CustomerSupportCenter
        cases={supportCases.map((supportCase) => ({
          bookingReference: supportCase.bookingReference,
          caseNumber: supportCase.caseNumber,
          category: supportCase.category,
          createdAt: supportCase.createdAt.toISOString(),
          id: supportCase.id,
          message: supportCase.message,
          resolutionNote: supportCase.resolutionNote,
          status: supportCase.status,
          subject: supportCase.subject,
          updatedAt: supportCase.updatedAt.toISOString(),
        }))}
        initialRequest={initialRequest}
      />

      {totalPages > 1 ? (
        <nav aria-label="Customer support case pages" className="business-audit-pagination">
          {page > 1 ? (
            <Link className="ui-button ui-button--secondary" href={pagePath(page - 1, status)}>
              Previous page
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link className="ui-button ui-button--secondary" href={pagePath(page + 1, status)}>
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
