import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Prisma } from '@/generated/prisma/client';

import { AdminSettlementManager } from '@/components/admin/AdminSettlementManager';
import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import {
  ADMIN_SETTLEMENT_PAGE_SIZE,
  ADMIN_SETTLEMENT_RESULT_LIMIT,
  ADMIN_SETTLEMENT_STATUSES,
  adminSettlementPath,
  normalizeAdminSettlementFilters,
  privateSettlementReference,
} from '@/services/adminSettlementWorkbenchService';

export const metadata: Metadata = { title: 'Partner settlements' };
type SearchValue = string | string[] | undefined;
type Props = {
  searchParams: Promise<{ page?: SearchValue; q?: SearchValue; status?: SearchValue }>;
};

export default async function AdminSettlementsPage({ searchParams }: Props) {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/settlements');
  const filters = normalizeAdminSettlementFilters(await searchParams);
  const where: Prisma.PartnerSettlementWhereInput = {
    ...(filters.status === 'ALL' ? {} : { status: filters.status }),
    ...(filters.query
      ? {
          OR: [
            { id: { contains: filters.query } },
            { partner: { name: { contains: filters.query } } },
            { partnerId: { contains: filters.query } },
            { periodStart: { contains: filters.query } },
            { periodEnd: { contains: filters.query } },
          ],
        }
      : {}),
  };
  const [partners, matchingCount, draftCount, approvedCount, paidCount] = await Promise.all([
    prisma.supplyPartner.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
      where: { status: 'ACTIVE' },
    }),
    prisma.partnerSettlement.count({ where }),
    prisma.partnerSettlement.count({ where: { status: 'DRAFT' } }),
    prisma.partnerSettlement.count({ where: { status: 'APPROVED' } }),
    prisma.partnerSettlement.count({ where: { status: 'PAID' } }),
  ]);
  const boundedCount = Math.min(matchingCount, ADMIN_SETTLEMENT_RESULT_LIMIT);
  const pageCount = Math.max(1, Math.ceil(boundedCount / ADMIN_SETTLEMENT_PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const settlements = await prisma.partnerSettlement.findMany({
    include: {
      events: {
        include: { actor: { select: { firstName: true, lastName: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 5,
      },
      partner: { select: { name: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: (page - 1) * ADMIN_SETTLEMENT_PAGE_SIZE,
    take: ADMIN_SETTLEMENT_PAGE_SIZE,
    where,
  });
  const activeFilters = { ...filters, page };

  return (
    <section className="account-page admin-workspace">
      <header className="admin-hero">
        <div>
          <p className="hotel-page__eyebrow">Audited supplier finance</p>
          <h1>Partner settlements</h1>
          <p>
            Calculate eligible captured value, preserve approval history, and record paid references
            with conflict-safe human review.
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/admin/finance">
          Finance operations
        </Link>
      </header>

      <div className="partner-bookings__summary">
        <Card className={draftCount ? 'admin-metric admin-metric--attention' : 'admin-metric'}>
          <span>Draft review</span>
          <strong>{draftCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Approved</span>
          <strong>{approvedCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Paid</span>
          <strong>{paidCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Matching records</span>
          <strong>{matchingCount.toLocaleString('en-IN')}</strong>
        </Card>
      </div>

      <form className="business-report__filters" method="get">
        <label className="ui-field business-report__search">
          <span className="ui-field__label">Settlement lookup</span>
          <input
            className="ui-input"
            defaultValue={filters.query}
            maxLength={100}
            name="q"
            placeholder="Supplier, settlement, or period"
            type="search"
          />
        </label>
        <label className="ui-field">
          <span className="ui-field__label">State</span>
          <select className="ui-input" defaultValue={filters.status} name="status">
            {ADMIN_SETTLEMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === 'ALL' ? 'All states' : status}
              </option>
            ))}
          </select>
        </label>
        <div className="business-report__filter-actions">
          <button className="ui-button ui-button--primary" type="submit">
            Apply filters
          </button>
          <Link className="ui-button ui-button--secondary" href="/admin/settlements">
            Clear
          </Link>
        </div>
      </form>

      {matchingCount > ADMIN_SETTLEMENT_RESULT_LIMIT ? (
        <Card className="ui-card--padded">
          <strong>Deep-history limit reached.</strong>
          <p>
            Refine the filters to review records beyond the first{' '}
            {ADMIN_SETTLEMENT_RESULT_LIMIT.toLocaleString('en-IN')} matches.
          </p>
        </Card>
      ) : null}

      <AdminSettlementManager
        partners={partners}
        settlements={settlements.map((settlement) => ({
          bookingCount: settlement.bookingCount,
          currency: settlement.currency,
          events: settlement.events.map((event) => ({
            action: event.action,
            actorName: `${event.actor.firstName} ${event.actor.lastName}`.trim(),
            createdAt: event.createdAt.toISOString(),
            fromStatus: event.fromStatus,
            note: event.note,
            toStatus: event.toStatus,
            version: event.version,
          })),
          grossAmount: settlement.grossAmount,
          id: settlement.id,
          netAmount: settlement.netAmount,
          partner: settlement.partner,
          paymentReference: privateSettlementReference(settlement.paymentReference),
          periodEnd: settlement.periodEnd,
          periodStart: settlement.periodStart,
          status: settlement.status,
          version: settlement.version,
        }))}
      />

      <nav aria-label="Settlement pages" className="business-audit-pagination">
        {page > 1 ? (
          <Link
            className="ui-button ui-button--secondary"
            href={adminSettlementPath(activeFilters, page - 1)}
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
            href={adminSettlementPath(activeFilters, page + 1)}
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
