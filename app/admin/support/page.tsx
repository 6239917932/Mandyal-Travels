import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  AdminBusinessSupportQueueTable,
  AdminCustomerSupportQueueTable,
} from '@/components/admin/AdminSupportQueueTable';
import { Card } from '@/components/ui/Card';
import type { Prisma } from '@/generated/prisma/client';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import {
  ADMIN_SUPPORT_PAGE_SIZE,
  adminSupportQueuePath,
  normalizeAdminSupportQueueFilters,
  type AdminSupportQueueFilters,
} from '@/services/adminSupportQueueService';

export const metadata: Metadata = { title: 'Support operations' };

type AdminSupportPageProps = {
  searchParams: Promise<{
    page?: string | string[];
    q?: string | string[];
    status?: string | string[];
    type?: string | string[];
  }>;
};

function customerWhere(filters: AdminSupportQueueFilters): Prisma.CustomerSupportCaseWhereInput {
  return {
    ...(filters.status === 'ALL' ? {} : { status: filters.status }),
    ...(filters.query
      ? {
          OR: [
            { bookingReference: { contains: filters.query } },
            { caseNumber: { contains: filters.query } },
            { category: { contains: filters.query } },
            { message: { contains: filters.query } },
            { subject: { contains: filters.query } },
            { createdBy: { is: { email: { contains: filters.query } } } },
            { createdBy: { is: { firstName: { contains: filters.query } } } },
            { createdBy: { is: { lastName: { contains: filters.query } } } },
          ],
        }
      : {}),
  };
}

function businessWhere(filters: AdminSupportQueueFilters): Prisma.BusinessSupportCaseWhereInput {
  return {
    ...(filters.status === 'ALL' ? {} : { status: filters.status }),
    ...(filters.query
      ? {
          OR: [
            { bookingReference: { contains: filters.query } },
            { caseNumber: { contains: filters.query } },
            { category: { contains: filters.query } },
            { message: { contains: filters.query } },
            { subject: { contains: filters.query } },
            { createdBy: { is: { email: { contains: filters.query } } } },
            { createdBy: { is: { firstName: { contains: filters.query } } } },
            { createdBy: { is: { lastName: { contains: filters.query } } } },
            { organization: { is: { name: { contains: filters.query } } } },
          ],
        }
      : {}),
  };
}

export default async function AdminSupportPage({ searchParams }: AdminSupportPageProps) {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/support');

  const filters = normalizeAdminSupportQueueFilters(await searchParams);
  const [openCustomerCases, openBusinessCases] = await Promise.all([
    prisma.customerSupportCase.count({ where: { status: 'OPEN' } }),
    prisma.businessSupportCase.count({ where: { status: 'OPEN' } }),
  ]);

  const customerFilter = customerWhere(filters);
  const businessFilter = businessWhere(filters);
  const selectedTotal =
    filters.type === 'CUSTOMER'
      ? await prisma.customerSupportCase.count({ where: customerFilter })
      : await prisma.businessSupportCase.count({ where: businessFilter });
  const totalPages = Math.max(1, Math.ceil(selectedTotal / ADMIN_SUPPORT_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const orderBy =
    filters.status === 'OPEN' ? ({ createdAt: 'asc' } as const) : ({ updatedAt: 'desc' } as const);

  const customerCases =
    filters.type === 'CUSTOMER'
      ? await prisma.customerSupportCase.findMany({
          include: {
            createdBy: { select: { email: true, firstName: true, id: true, lastName: true } },
          },
          orderBy,
          skip: (page - 1) * ADMIN_SUPPORT_PAGE_SIZE,
          take: ADMIN_SUPPORT_PAGE_SIZE,
          where: customerFilter,
        })
      : [];
  const businessCases =
    filters.type === 'BUSINESS'
      ? await prisma.businessSupportCase.findMany({
          include: {
            createdBy: { select: { email: true, firstName: true, id: true, lastName: true } },
            organization: { select: { id: true, name: true } },
          },
          orderBy,
          skip: (page - 1) * ADMIN_SUPPORT_PAGE_SIZE,
          take: ADMIN_SUPPORT_PAGE_SIZE,
          where: businessFilter,
        })
      : [];

  return (
    <section className="account-page business-report admin-workspace">
      <header className="admin-hero">
        <div>
          <p className="hotel-page__eyebrow">Governed customer servicing</p>
          <h1>Support operations</h1>
          <p>
            Search the complete customer or company queue, review oldest open cases first, and use
            the existing audited resolution controls.
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/admin">
          Operations console
        </Link>
      </header>

      <div className="partner-bookings__summary">
        <Card>
          <span>Open customer cases</span>
          <strong>{openCustomerCases}</strong>
          <Link href="/admin/support?type=CUSTOMER&status=OPEN">Open customer queue</Link>
        </Card>
        <Card>
          <span>Open company cases</span>
          <strong>{openBusinessCases}</strong>
          <Link href="/admin/support?type=BUSINESS&status=OPEN">Open company queue</Link>
        </Card>
        <Card>
          <span>Current result</span>
          <strong>{selectedTotal}</strong>
          <small>Matching {filters.type.toLowerCase()} cases</small>
        </Card>
      </div>

      <form className="business-report__filters" method="get">
        <div className="ui-field">
          <label className="ui-field__label" htmlFor="support-type">
            Queue
          </label>
          <select className="ui-input" defaultValue={filters.type} id="support-type" name="type">
            <option value="CUSTOMER">Customer cases</option>
            <option value="BUSINESS">Company cases</option>
          </select>
        </div>
        <div className="ui-field">
          <label className="ui-field__label" htmlFor="support-status">
            Status
          </label>
          <select
            className="ui-input"
            defaultValue={filters.status}
            id="support-status"
            name="status"
          >
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
            <option value="ALL">All statuses</option>
          </select>
        </div>
        <div className="ui-field business-report__search">
          <label className="ui-field__label" htmlFor="support-query">
            Case, customer, organization, booking, or message
          </label>
          <input
            className="ui-input"
            defaultValue={filters.query}
            id="support-query"
            maxLength={100}
            name="q"
            placeholder="Search support cases"
            type="search"
          />
        </div>
        <div className="business-report__filter-actions">
          <button className="ui-button ui-button--primary" type="submit">
            Apply filters
          </button>
          <Link className="ui-button ui-button--secondary" href="/admin/support">
            Reset
          </Link>
        </div>
      </form>

      <Card className="business-report__table-card">
        <div className="business-report__table-scroll">
          {filters.type === 'CUSTOMER' ? (
            <AdminCustomerSupportQueueTable cases={customerCases} />
          ) : (
            <AdminBusinessSupportQueueTable cases={businessCases} />
          )}
        </div>
      </Card>

      <nav aria-label="Support queue pages" className="business-audit-pagination">
        {page > 1 ? (
          <Link
            className="ui-button ui-button--secondary"
            href={adminSupportQueuePath(filters, page - 1)}
          >
            Previous page
          </Link>
        ) : (
          <span />
        )}
        <span>
          {selectedTotal.toLocaleString('en-IN')} cases · Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Link
            className="ui-button ui-button--secondary"
            href={adminSupportQueuePath(filters, page + 1)}
          >
            Next page
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <p className="booking-confirmation__note">
        This workbench uses governed portal records only. No AI provider is active, and no support,
        booking, payment, refund, or eligibility decision is automated.
      </p>
    </section>
  );
}
