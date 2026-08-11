import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { BusinessSupportCenter } from '@/components/business/BusinessSupportCenter';
import { Card } from '@/components/ui/Card';
import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Company support cases' };

const PAGE_SIZE = 50;
const SUPPORT_STATUSES = new Set(['ALL', 'OPEN', 'CLOSED']);

type BusinessSupportPageProps = {
  searchParams: Promise<{ page?: string | string[]; status?: string | string[] }>;
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
  return `/business/support?${query.toString()}`;
}

export default async function BusinessSupportPage({ searchParams }: BusinessSupportPageProps) {
  const access = await getBusinessAdminMembership();
  if (!access) redirect('/business');

  const values = await searchParams;
  const status = readStatus(values.status);
  const organizationId = access.membership.organizationId;
  const where = {
    organizationId,
    ...(status === 'ALL' ? {} : { status }),
  };
  const [organization, totalCases, openCases, closedCases] = await Promise.all([
    prisma.organization.findUnique({ select: { name: true }, where: { id: organizationId } }),
    prisma.businessSupportCase.count({ where }),
    prisma.businessSupportCase.count({ where: { organizationId, status: 'OPEN' } }),
    prisma.businessSupportCase.count({ where: { organizationId, status: 'CLOSED' } }),
  ]);
  if (!organization) redirect('/business');

  const totalPages = Math.max(1, Math.ceil(totalCases / PAGE_SIZE));
  const page = Math.min(readPage(values.page), totalPages);
  const supportCases = await prisma.businessSupportCase.findMany({
    include: { createdBy: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    where,
  });

  return (
    <section className="account-page">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Account servicing</p>
          <h1>Company support cases</h1>
          <p>{organization.name}</p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/business/dashboard">
          Back to business workspace
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

      <nav aria-label="Support case filters" className="business-report__filters">
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

      <BusinessSupportCenter
        cases={supportCases.map((supportCase) => ({
          bookingReference: supportCase.bookingReference,
          caseNumber: supportCase.caseNumber,
          category: supportCase.category,
          createdAt: supportCase.createdAt.toISOString(),
          createdByName: `${supportCase.createdBy.firstName} ${supportCase.createdBy.lastName}`,
          id: supportCase.id,
          message: supportCase.message,
          status: supportCase.status,
          subject: supportCase.subject,
        }))}
      />

      {totalPages > 1 ? (
        <nav aria-label="Company support case pages" className="business-audit-pagination">
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
