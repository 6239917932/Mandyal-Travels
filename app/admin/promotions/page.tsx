import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Prisma } from '@/generated/prisma/client';

import {
  AdminPromotionCreateForm,
  AdminPromotionStatus,
} from '@/components/admin/AdminPromotionManager';
import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import {
  ADMIN_PROMOTION_PAGE_SIZE,
  ADMIN_PROMOTION_PRODUCTS,
  ADMIN_PROMOTION_RESULT_LIMIT,
  ADMIN_PROMOTION_STATUSES,
  adminPromotionPath,
  normalizeAdminPromotionFilters,
  promotionActivationBlockReason,
  promotionOperationalState,
  readPromotionProducts,
} from '@/services/adminPromotionWorkbenchService';

export const metadata: Metadata = { title: 'Promotion operations' };

function date(value: Date) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    value,
  );
}

type SearchValue = string | string[] | undefined;
type Props = {
  searchParams: Promise<{
    page?: SearchValue;
    product?: SearchValue;
    q?: SearchValue;
    status?: SearchValue;
  }>;
};

export default async function AdminPromotionsPage({ searchParams }: Props) {
  const administrator = await getPlatformAdmin();
  if (!administrator) redirect('/login?returnTo=/admin/promotions');
  const now = new Date();
  const filters = normalizeAdminPromotionFilters(await searchParams);
  const statusWhere: Prisma.PromotionCampaignWhereInput =
    filters.status === 'ACTIVE'
      ? { active: true, endsAt: { gte: now }, startsAt: { lte: now } }
      : filters.status === 'SCHEDULED'
        ? { endsAt: { gte: now }, startsAt: { gt: now } }
        : filters.status === 'PAUSED'
          ? { active: false, endsAt: { gte: now }, startsAt: { lte: now } }
          : filters.status === 'EXPIRED'
            ? { endsAt: { lt: now } }
            : filters.status === 'EXHAUSTED'
              ? { endsAt: { gte: now }, usageLimit: { not: null } }
              : {};
  const where: Prisma.PromotionCampaignWhereInput = {
    ...statusWhere,
    ...(filters.product === 'ALL' ? {} : { productsJson: { contains: `"${filters.product}"` } }),
    ...(filters.query
      ? {
          OR: [
            { code: { contains: filters.query } },
            { name: { contains: filters.query } },
            { description: { contains: filters.query } },
          ],
        }
      : {}),
  };
  const [matchingCount, activeCount, scheduledCount, cappedCount, expiredCount, events] =
    await Promise.all([
      prisma.promotionCampaign.count({ where }),
      prisma.promotionCampaign.count({
        where: { active: true, endsAt: { gte: now }, startsAt: { lte: now } },
      }),
      prisma.promotionCampaign.count({
        where: { endsAt: { gte: now }, startsAt: { gt: now } },
      }),
      prisma.promotionCampaign.count({
        where: { active: true, endsAt: { gte: now }, usageLimit: { not: null } },
      }),
      prisma.promotionCampaign.count({ where: { endsAt: { lt: now } } }),
      prisma.promotionCampaignEvent.findMany({
        include: {
          actor: { select: { firstName: true, lastName: true } },
          campaign: { select: { code: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);
  const boundedCount = Math.min(matchingCount, ADMIN_PROMOTION_RESULT_LIMIT);
  const pageCount = Math.max(1, Math.ceil(boundedCount / ADMIN_PROMOTION_PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const campaigns = await prisma.promotionCampaign.findMany({
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    skip: (page - 1) * ADMIN_PROMOTION_PAGE_SIZE,
    take: ADMIN_PROMOTION_PAGE_SIZE,
    where,
  });
  const activeFilters = { ...filters, page };

  return (
    <section className="account-page platform-admin-page admin-workspace">
      <header className="admin-hero">
        <div className="admin-hero__content">
          <p className="admin-hero__eyebrow">Versioned commercial rules</p>
          <h1>Promotions and coupon campaigns</h1>
          <p>
            Create bounded campaigns in a paused state, review their dates and products, then
            activate them deliberately.
          </p>
          <Link className="ui-button ui-button--secondary" href="/admin">
            Back to operations
          </Link>
        </div>
      </header>

      <Card>
        <h2>Create campaign</h2>
        <AdminPromotionCreateForm />
      </Card>

      <div className="partner-bookings__summary">
        <Card>
          <span>Enabled campaigns</span>
          <strong>{activeCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Scheduled campaigns</span>
          <strong>{scheduledCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card className={cappedCount ? 'admin-metric admin-metric--attention' : 'admin-metric'}>
          <span>Usage-capped campaigns</span>
          <strong>{cappedCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Expired campaigns</span>
          <strong>{expiredCount.toLocaleString('en-IN')}</strong>
        </Card>
      </div>

      <form className="business-report__filters" method="get">
        <label className="ui-field business-report__search">
          <span className="ui-field__label">Campaign lookup</span>
          <input
            className="ui-input"
            defaultValue={filters.query}
            maxLength={100}
            name="q"
            placeholder="Code, name, or description"
            type="search"
          />
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Operational state</span>
          <select className="ui-input" defaultValue={filters.status} name="status">
            {ADMIN_PROMOTION_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item === 'ALL' ? 'All states' : item.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Eligible product</span>
          <select className="ui-input" defaultValue={filters.product} name="product">
            {ADMIN_PROMOTION_PRODUCTS.map((item) => (
              <option key={item} value={item}>
                {item === 'ALL' ? 'All products' : item}
              </option>
            ))}
          </select>
        </label>
        <div className="business-report__filter-actions">
          <button className="ui-button ui-button--primary" type="submit">
            Apply filters
          </button>
          <Link className="ui-button ui-button--secondary" href="/admin/promotions">
            Clear
          </Link>
        </div>
      </form>

      <div className="partner-bookings__summary">
        <Card>
          <span>Matching campaigns</span>
          <strong>{matchingCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Control model</span>
          <strong>Human-reviewed changes</strong>
        </Card>
      </div>

      {matchingCount > ADMIN_PROMOTION_RESULT_LIMIT ? (
        <Card className="ui-card--padded">
          <strong>Deep-history limit reached.</strong>
          <p>
            Refine the campaign filters to review records beyond the first{' '}
            {ADMIN_PROMOTION_RESULT_LIMIT.toLocaleString('en-IN')} matches.
          </p>
        </Card>
      ) : null}

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Commercial catalogue</p>
          <h2>Governed campaigns</h2>
        </div>
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Products</th>
                  <th>Rule</th>
                  <th>Window</th>
                  <th>State</th>
                  <th>Control</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => {
                  const operationalState = promotionOperationalState(campaign, now);
                  const activationBlock = promotionActivationBlockReason(campaign, now);
                  return (
                    <tr key={campaign.id}>
                      <td>
                        <strong>{campaign.code}</strong>
                        <span>{campaign.name}</span>
                        <span>Version {campaign.version}</span>
                      </td>
                      <td>
                        {readPromotionProducts(campaign.productsJson).join(', ') || 'Invalid'}
                      </td>
                      <td>
                        <strong>{campaign.percentOff}% off</strong>
                        <span>
                          Minimum {campaign.minimumSubtotal}; cap {campaign.maximumDiscount}
                        </span>
                        <span>
                          {campaign.usageLimit
                            ? `${campaign.usageCount} of ${campaign.usageLimit} uses claimed`
                            : 'No usage cap configured'}
                        </span>
                      </td>
                      <td>
                        <strong>{date(campaign.startsAt)}</strong>
                        <span>to {date(campaign.endsAt)}</span>
                      </td>
                      <td>
                        <strong>{operationalState.replaceAll('_', ' ')}</strong>
                        <span>{activationBlock || 'Eligible for governed activation'}</span>
                      </td>
                      <td>
                        {campaign.active || !activationBlock ? (
                          <AdminPromotionStatus
                            active={campaign.active}
                            campaignId={campaign.id}
                            version={campaign.version}
                          />
                        ) : (
                          'Activation unavailable'
                        )}
                      </td>
                    </tr>
                  );
                })}
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      No database-backed campaigns created. Existing baseline codes remain available
                      until replaced.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
        <nav aria-label="Promotion campaign pages" className="business-audit-pagination">
          {page > 1 ? (
            <Link
              className="ui-button ui-button--secondary"
              href={adminPromotionPath(activeFilters, page - 1)}
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
              href={adminPromotionPath(activeFilters, page + 1)}
            >
              Next page
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>

      <Card className="business-report__table-card">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Append-only history</p>
          <h2>Recent campaign changes</h2>
        </div>
        <div className="business-report__table-scroll">
          <table className="business-report__table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Change</th>
                <th>Reason</th>
                <th>Administrator</th>
                <th>Changed</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{event.campaign.code}</td>
                  <td>
                    {event.action} · v{event.version}
                  </td>
                  <td>{event.reason}</td>
                  <td>
                    {event.actor.firstName} {event.actor.lastName}
                  </td>
                  <td>{date(event.createdAt)}</td>
                </tr>
              ))}
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5}>No campaign changes have been recorded.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
