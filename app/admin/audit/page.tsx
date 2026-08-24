import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { privateAggregateReference } from '@/services/adminExceptionWorkbenchService';
import {
  ADMIN_AUDIT_DOMAINS,
  ADMIN_AUDIT_MAX_PAGE,
  ADMIN_AUDIT_PAGE_SIZE,
  type AdminAuditDomain,
  adminAuditCreatedAtRange,
  adminAuditPath,
  auditSourceTake,
  normalizeAdminAuditFilters,
} from '@/services/adminAuditWorkbenchService';

export const metadata: Metadata = { title: 'Administrator audit workbench' };

type AdminAuditPageProps = {
  searchParams: Promise<{
    domain?: string | string[];
    from?: string | string[];
    page?: string | string[];
    q?: string | string[];
    to?: string | string[];
  }>;
};

type AuditRecord = {
  action: string;
  actor: string;
  context: string;
  createdAt: Date;
  detail: string;
  domain: Exclude<AdminAuditDomain, 'ALL'>;
  id: string;
  subject: string;
};

const actorLabel = (actor: { email: string; firstName: string; lastName: string } | null) =>
  actor ? `${actor.firstName} ${actor.lastName} · ${actor.email}` : 'System or removed account';

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

function domainLabel(domain: AdminAuditDomain) {
  return domain === 'ALL'
    ? 'All governed domains'
    : domain.charAt(0) + domain.slice(1).toLowerCase();
}

export default async function AdminAuditPage({ searchParams }: AdminAuditPageProps) {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/audit');

  const filters = normalizeAdminAuditFilters(await searchParams);
  const createdAt = adminAuditCreatedAtRange(filters.from, filters.to);
  const take = auditSourceTake(filters.page);
  const enabled = (domain: Exclude<AdminAuditDomain, 'ALL'>) =>
    filters.domain === 'ALL' || filters.domain === domain;
  const actorSelect = { email: true, firstName: true, lastName: true } as const;

  const partnerWhere = enabled('PARTNER')
    ? {
        ...(createdAt ? { createdAt } : {}),
        ...(filters.query
          ? {
              OR: [
                { action: { contains: filters.query } },
                { entityType: { contains: filters.query } },
                { summary: { contains: filters.query } },
                { partner: { is: { name: { contains: filters.query } } } },
              ],
            }
          : {}),
      }
    : { id: '__disabled__' };
  const organizationWhere = enabled('ORGANIZATION')
    ? {
        ...(createdAt ? { createdAt } : {}),
        ...(filters.query
          ? {
              OR: [
                { action: { contains: filters.query } },
                { entityType: { contains: filters.query } },
                { summary: { contains: filters.query } },
                { organization: { is: { name: { contains: filters.query } } } },
              ],
            }
          : {}),
      }
    : { id: '__disabled__' };
  const supportWhere = enabled('SUPPORT')
    ? {
        ...(createdAt ? { createdAt } : {}),
        ...(filters.query
          ? {
              OR: [
                { action: { contains: filters.query } },
                { summary: { contains: filters.query } },
                { supportCase: { is: { caseNumber: { contains: filters.query } } } },
                { supportCase: { is: { subject: { contains: filters.query } } } },
              ],
            }
          : {}),
      }
    : { id: '__disabled__' };
  const securityWhere = enabled('SECURITY')
    ? {
        ...(createdAt ? { createdAt } : {}),
        ...(filters.query
          ? {
              OR: [
                { action: { contains: filters.query } },
                { summary: { contains: filters.query } },
                { user: { is: { email: { contains: filters.query } } } },
              ],
            }
          : {}),
      }
    : { id: '__disabled__' };
  const privacyWhere = enabled('PRIVACY')
    ? {
        ...(createdAt ? { createdAt } : {}),
        ...(filters.query
          ? {
              OR: [
                { action: { contains: filters.query } },
                { note: { contains: filters.query } },
                { request: { is: { requestType: { contains: filters.query } } } },
                { request: { is: { user: { is: { email: { contains: filters.query } } } } } },
              ],
            }
          : {}),
      }
    : { id: '__disabled__' };
  const platformWhere = enabled('PLATFORM')
    ? {
        ...(createdAt ? { createdAt } : {}),
        ...(filters.query
          ? {
              OR: [
                { flagKey: { contains: filters.query } },
                { reason: { contains: filters.query } },
              ],
            }
          : {}),
      }
    : { id: '__disabled__' };
  const contentWhere = enabled('CONTENT')
    ? {
        ...(createdAt ? { createdAt } : {}),
        ...(filters.query
          ? {
              OR: [
                { action: { contains: filters.query } },
                { reason: { contains: filters.query } },
                { status: { contains: filters.query } },
                { destination: { is: { name: { contains: filters.query } } } },
                { destination: { is: { slug: { contains: filters.query } } } },
              ],
            }
          : {}),
      }
    : { id: '__disabled__' };
  const commercialWhere = enabled('COMMERCIAL')
    ? {
        ...(createdAt ? { createdAt } : {}),
        ...(filters.query
          ? {
              OR: [
                { action: { contains: filters.query } },
                { reason: { contains: filters.query } },
                { campaign: { is: { code: { contains: filters.query } } } },
                { campaign: { is: { name: { contains: filters.query } } } },
              ],
            }
          : {}),
      }
    : { id: '__disabled__' };
  const financeWhere = enabled('FINANCE')
    ? {
        ...(createdAt ? { createdAt } : {}),
        ...(filters.query
          ? {
              OR: [
                { action: { contains: filters.query } },
                { fromStatus: { contains: filters.query } },
                { note: { contains: filters.query } },
                { toStatus: { contains: filters.query } },
                { settlement: { is: { partner: { is: { name: { contains: filters.query } } } } } },
              ],
            }
          : {}),
      }
    : { id: '__disabled__' };
  const operationsWhere = enabled('OPERATIONS')
    ? {
        ...(createdAt ? { createdAt } : {}),
        ...(filters.query
          ? {
              OR: [
                { action: { contains: filters.query } },
                { fromStatus: { contains: filters.query } },
                { note: { contains: filters.query } },
                { toStatus: { contains: filters.query } },
                { event: { is: { aggregateType: { contains: filters.query } } } },
                { event: { is: { eventType: { contains: filters.query } } } },
              ],
            }
          : {}),
      }
    : { id: '__disabled__' };
  const searchProjectionWhere = enabled('OPERATIONS')
    ? {
        ...(createdAt ? { createdAt } : {}),
        ...(filters.query
          ? {
              OR: [
                { entityType: { contains: filters.query } },
                { reason: { contains: filters.query } },
              ],
            }
          : {}),
      }
    : { id: '__disabled__' };

  const [
    partnerCount,
    partnerEvents,
    organizationCount,
    organizationEvents,
    supportCount,
    supportEvents,
    securityCount,
    securityEvents,
    privacyCount,
    privacyEvents,
    platformCount,
    platformEvents,
    contentCount,
    contentEvents,
    commercialCount,
    commercialEvents,
    financeCount,
    financeEvents,
    operationsCount,
    operationsEvents,
    searchProjectionCount,
    searchProjectionEvents,
  ] = await Promise.all([
    prisma.partnerAuditLog.count({ where: partnerWhere }),
    prisma.partnerAuditLog.findMany({
      include: { actor: { select: actorSelect }, partner: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take,
      where: partnerWhere,
    }),
    prisma.businessAuditLog.count({ where: organizationWhere }),
    prisma.businessAuditLog.findMany({
      include: { actor: { select: actorSelect }, organization: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take,
      where: organizationWhere,
    }),
    prisma.customerSupportCaseEvent.count({ where: supportWhere }),
    prisma.customerSupportCaseEvent.findMany({
      include: {
        actor: { select: actorSelect },
        supportCase: { select: { caseNumber: true, subject: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      where: supportWhere,
    }),
    prisma.accountSecurityEvent.count({ where: securityWhere }),
    prisma.accountSecurityEvent.findMany({
      include: { user: { select: actorSelect } },
      orderBy: { createdAt: 'desc' },
      take,
      where: securityWhere,
    }),
    prisma.dataPrivacyRequestEvent.count({ where: privacyWhere }),
    prisma.dataPrivacyRequestEvent.findMany({
      include: {
        actor: { select: actorSelect },
        request: { select: { requestType: true, user: { select: { email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      where: privacyWhere,
    }),
    prisma.platformFeatureFlagEvent.count({ where: platformWhere }),
    prisma.platformFeatureFlagEvent.findMany({
      include: { actor: { select: actorSelect } },
      orderBy: { createdAt: 'desc' },
      take,
      where: platformWhere,
    }),
    prisma.destinationContentEvent.count({ where: contentWhere }),
    prisma.destinationContentEvent.findMany({
      include: {
        actor: { select: actorSelect },
        destination: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      where: contentWhere,
    }),
    prisma.promotionCampaignEvent.count({ where: commercialWhere }),
    prisma.promotionCampaignEvent.findMany({
      include: {
        actor: { select: actorSelect },
        campaign: { select: { code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      where: commercialWhere,
    }),
    prisma.partnerSettlementEvent.count({ where: financeWhere }),
    prisma.partnerSettlementEvent.findMany({
      include: {
        actor: { select: actorSelect },
        settlement: {
          select: {
            partner: { select: { name: true } },
            periodEnd: true,
            periodStart: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
      where: financeWhere,
    }),
    prisma.integrationOutboxReviewEvent.count({ where: operationsWhere }),
    prisma.integrationOutboxReviewEvent.findMany({
      include: {
        actor: { select: actorSelect },
        event: { select: { aggregateId: true, aggregateType: true, eventType: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      where: operationsWhere,
    }),
    prisma.searchProjectionRebuildEvent.count({ where: searchProjectionWhere }),
    prisma.searchProjectionRebuildEvent.findMany({
      include: { actor: { select: actorSelect } },
      orderBy: { createdAt: 'desc' },
      take,
      where: searchProjectionWhere,
    }),
  ]);

  const records: AuditRecord[] = [
    ...partnerEvents.map((event) => ({
      action: event.action,
      actor: actorLabel(event.actor),
      context: event.partner.name,
      createdAt: event.createdAt,
      detail: event.summary,
      domain: 'PARTNER' as const,
      id: `partner-${event.id}`,
      subject: `${event.entityType}${event.entityId ? ` · ${event.entityId}` : ''}`,
    })),
    ...organizationEvents.map((event) => ({
      action: event.action,
      actor: actorLabel(event.actor),
      context: event.organization.name,
      createdAt: event.createdAt,
      detail: event.summary,
      domain: 'ORGANIZATION' as const,
      id: `organization-${event.id}`,
      subject: `${event.entityType}${event.entityId ? ` · ${event.entityId}` : ''}`,
    })),
    ...supportEvents.map((event) => ({
      action: event.action,
      actor: actorLabel(event.actor),
      context: event.supportCase.caseNumber,
      createdAt: event.createdAt,
      detail: event.summary,
      domain: 'SUPPORT' as const,
      id: `support-${event.id}`,
      subject: event.supportCase.subject,
    })),
    ...securityEvents.map((event) => ({
      action: event.action,
      actor: actorLabel(event.user),
      context: event.user.email,
      createdAt: event.createdAt,
      detail: event.summary,
      domain: 'SECURITY' as const,
      id: `security-${event.id}`,
      subject: 'Account security event',
    })),
    ...privacyEvents.map((event) => ({
      action: event.action,
      actor: actorLabel(event.actor),
      context: event.request.user.email,
      createdAt: event.createdAt,
      detail: event.note,
      domain: 'PRIVACY' as const,
      id: `privacy-${event.id}`,
      subject: `${event.request.requestType} · ${event.fromStatus} to ${event.toStatus} · version ${event.version}`,
    })),
    ...platformEvents.map((event) => ({
      action: event.enabled ? 'ENABLED' : 'DISABLED',
      actor: actorLabel(event.actor),
      context: event.flagKey,
      createdAt: event.createdAt,
      detail: event.reason,
      domain: 'PLATFORM' as const,
      id: `platform-${event.id}`,
      subject: `Feature flag · version ${event.version}`,
    })),
    ...contentEvents.map((event) => ({
      action: event.action,
      actor: actorLabel(event.actor),
      context: event.destination.name,
      createdAt: event.createdAt,
      detail: event.reason,
      domain: 'CONTENT' as const,
      id: `content-${event.id}`,
      subject: `${event.status} · version ${event.version} · ${event.destination.slug}`,
    })),
    ...commercialEvents.map((event) => ({
      action: event.action,
      actor: actorLabel(event.actor),
      context: `${event.campaign.name} · ${event.campaign.code}`,
      createdAt: event.createdAt,
      detail: event.reason,
      domain: 'COMMERCIAL' as const,
      id: `commercial-${event.id}`,
      subject: `${event.fromActive ? 'Active' : 'Inactive'} to ${event.toActive ? 'active' : 'inactive'} · version ${event.version}`,
    })),
    ...financeEvents.map((event) => ({
      action: event.action,
      actor: actorLabel(event.actor),
      context: event.settlement.partner.name,
      createdAt: event.createdAt,
      detail: event.note,
      domain: 'FINANCE' as const,
      id: `finance-${event.id}`,
      subject: `${event.fromStatus} to ${event.toStatus} · ${event.settlement.periodStart}–${event.settlement.periodEnd} · version ${event.version}`,
    })),
    ...operationsEvents.map((event) => ({
      action: event.action,
      actor: actorLabel(event.actor),
      context: `${event.event.aggregateType} · ${privateAggregateReference(event.event.aggregateType, event.event.aggregateId)}`,
      createdAt: event.createdAt,
      detail: event.note,
      domain: 'OPERATIONS' as const,
      id: `operations-${event.id}`,
      subject: `${event.event.eventType} · ${event.fromStatus} to ${event.toStatus}`,
    })),
    ...searchProjectionEvents.map((event) => ({
      action: 'SEARCH_PROJECTIONS_REBUILT',
      actor: actorLabel(event.actor),
      context: `${event.entityType} search`,
      createdAt: event.createdAt,
      detail: event.reason,
      domain: 'OPERATIONS' as const,
      id: `search-projection-${event.id}`,
      subject: `${event.projectedCount} projected · ${event.removedCount} stale removed · ${event.sourceCount} eligible sources`,
    })),
  ].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

  const totalCount =
    partnerCount +
    organizationCount +
    supportCount +
    securityCount +
    privacyCount +
    platformCount +
    contentCount +
    commercialCount +
    financeCount +
    operationsCount +
    searchProjectionCount;
  const availablePages = Math.max(1, Math.ceil(totalCount / ADMIN_AUDIT_PAGE_SIZE));
  const pageCount = Math.min(availablePages, ADMIN_AUDIT_MAX_PAGE);
  const page = Math.min(filters.page, pageCount);
  const pageStart = (page - 1) * ADMIN_AUDIT_PAGE_SIZE;
  const pageRecords = records.slice(pageStart, pageStart + ADMIN_AUDIT_PAGE_SIZE);
  const isLimited = availablePages > ADMIN_AUDIT_MAX_PAGE;

  return (
    <section className="account-page business-report admin-workspace">
      <header className="admin-hero">
        <div>
          <p className="admin-hero__eyebrow">Protected, read-only governance timeline</p>
          <h1>Administrator audit workbench</h1>
          <p>
            Review material platform, destination content, commercial, finance, integration,
            supplier, organization, support, privacy, and account-security activity without changing
            operational, inventory, payment, or refund records.
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/admin">
          Back to operations
        </Link>
      </header>

      <form className="business-report__filters" method="get">
        <div className="ui-field business-report__search">
          <label className="ui-field__label" htmlFor="admin-audit-search">
            Action, reason, reference, account, or governed record
          </label>
          <input
            className="ui-input"
            defaultValue={filters.query}
            id="admin-audit-search"
            maxLength={100}
            name="q"
            type="search"
          />
        </div>
        <label className="ui-field">
          <span className="ui-field__label">Domain</span>
          <select className="ui-input" defaultValue={filters.domain} name="domain">
            {ADMIN_AUDIT_DOMAINS.map((domain) => (
              <option key={domain} value={domain}>
                {domainLabel(domain)}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Created from</span>
          <input className="ui-input" defaultValue={filters.from} name="from" type="date" />
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Created to</span>
          <input className="ui-input" defaultValue={filters.to} name="to" type="date" />
        </label>
        <div className="business-report__filter-actions">
          <button className="ui-button ui-button--primary" type="submit">
            Apply filters
          </button>
          <Link className="ui-button ui-button--secondary" href="/admin/audit">
            Clear
          </Link>
        </div>
      </form>

      <div className="partner-bookings__summary">
        <Card>
          <span>Matching records</span>
          <strong>{totalCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Selected domain</span>
          <strong>{domainLabel(filters.domain)}</strong>
        </Card>
        <Card>
          <span>Control posture</span>
          <strong>Read only</strong>
        </Card>
      </div>

      {isLimited ? (
        <Card className="business-report__table-card">
          <p>
            This view is limited to the latest 1,000 matching records. Narrow the domain, search, or
            date range to inspect older activity without an unbounded database read.
          </p>
        </Card>
      ) : null}

      <Card className="business-report__table-card">
        <div className="business-report__table-scroll">
          <table className="business-report__table">
            <thead>
              <tr>
                <th>Domain and action</th>
                <th>Record</th>
                <th>Reason or summary</th>
                <th>Actor</th>
                <th>Recorded</th>
              </tr>
            </thead>
            <tbody>
              {pageRecords.map((record) => (
                <tr key={record.id}>
                  <td>
                    <strong>{domainLabel(record.domain)}</strong>
                    <span>{record.action.replaceAll('_', ' ')}</span>
                  </td>
                  <td>
                    <strong>{record.context}</strong>
                    <span>{record.subject}</span>
                  </td>
                  <td>{record.detail}</td>
                  <td>{record.actor}</td>
                  <td>
                    <time dateTime={record.createdAt.toISOString()}>
                      {formatDate(record.createdAt)}
                    </time>
                  </td>
                </tr>
              ))}
              {pageRecords.length === 0 ? (
                <tr>
                  <td colSpan={5}>No governed audit records match these filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <nav aria-label="Administrator audit pages" className="business-audit-pagination">
        {page > 1 ? (
          <Link className="ui-button ui-button--secondary" href={adminAuditPath(filters, page - 1)}>
            Previous page
          </Link>
        ) : (
          <span />
        )}
        <span>
          Page {page} of {pageCount}
        </span>
        {page < pageCount ? (
          <Link className="ui-button ui-button--secondary" href={adminAuditPath(filters, page + 1)}>
            Next page
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </section>
  );
}
