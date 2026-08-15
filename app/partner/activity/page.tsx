import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Partner activity log' };

const PAGE_SIZE = 50;

type PartnerActivityPageProps = {
  searchParams: Promise<{
    action?: string | string[];
    entityType?: string | string[];
    page?: string | string[];
    q?: string | string[];
  }>;
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function readPage(value: string | string[] | undefined): number {
  const parsed = Number(firstValue(value));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function activityPath(page: number, query: string, action: string, entityType: string): string {
  const parameters = new URLSearchParams({ page: String(page) });
  if (query) parameters.set('q', query);
  if (action) parameters.set('action', action);
  if (entityType) parameters.set('entityType', entityType);
  return `/partner/activity?${parameters.toString()}`;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

export default async function PartnerActivityPage({ searchParams }: PartnerActivityPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/partner/activity');
  const access = await getPartnerAccess();
  if (!access?.partnerId || !access.userId) redirect('/partners');

  const values = await searchParams;
  const query = firstValue(values.q).trim().slice(0, 100);
  const action = firstValue(values.action).trim().slice(0, 80);
  const entityType = firstValue(values.entityType).trim().slice(0, 80);
  const where = {
    action: action || undefined,
    entityType: entityType || undefined,
    partnerId: access.partnerId,
    ...(query
      ? {
          OR: [
            { summary: { contains: query } },
            { action: { contains: query } },
            { entityType: { contains: query } },
            { entityId: { contains: query } },
          ],
        }
      : {}),
  };

  const [totalEntries, actionRows, entityRows] = await Promise.all([
    prisma.partnerAuditLog.count({ where }),
    prisma.partnerAuditLog.findMany({
      distinct: ['action'],
      orderBy: { action: 'asc' },
      select: { action: true },
      where: { partnerId: access.partnerId },
    }),
    prisma.partnerAuditLog.findMany({
      distinct: ['entityType'],
      orderBy: { entityType: 'asc' },
      select: { entityType: true },
      where: { partnerId: access.partnerId },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));
  const page = Math.min(readPage(values.page), totalPages);
  const entries = await prisma.partnerAuditLog.findMany({
    include: { actor: { select: { firstName: true, lastName: true } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    where,
  });

  return (
    <section className="account-page partner-workspace">
      <div className="account-page__container">
        <header className="account-trips__heading">
          <p className="hotel-page__eyebrow">Supplier governance</p>
          <h1>Partner activity log</h1>
          <p>
            Review the immutable operational history recorded for {access.partnerName}. Results are
            restricted to this verified supplier account.
          </p>
          <Link className="ui-button ui-button--secondary" href="/partner">
            Back to workspace
          </Link>
        </header>

        <Card>
          <form className="supplier-form__grid" method="get">
            <label className="ui-field">
              <span className="ui-field__label">Search activity</span>
              <input className="ui-input" defaultValue={query} maxLength={100} name="q" placeholder="Summary, action, record type, or ID" />
            </label>
            <label className="ui-field">
              <span className="ui-field__label">Action</span>
              <select className="ui-input" defaultValue={action} name="action">
                <option value="">All actions</option>
                {actionRows.map((row) => <option key={row.action} value={row.action}>{row.action.replaceAll('_', ' ')}</option>)}
              </select>
            </label>
            <label className="ui-field">
              <span className="ui-field__label">Record type</span>
              <select className="ui-input" defaultValue={entityType} name="entityType">
                <option value="">All record types</option>
                {entityRows.map((row) => <option key={row.entityType} value={row.entityType}>{row.entityType.replaceAll('_', ' ')}</option>)}
              </select>
            </label>
            <button className="ui-button ui-button--primary" type="submit">Apply filters</button>
          </form>
        </Card>

        <div className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Accountability</p>
            <h2>{totalEntries.toLocaleString('en-IN')} recorded activities</h2>
          </div>
          <span>Page {page} of {totalPages}</span>
        </div>

        <Card className="partner-workspace__audit">
          {entries.map((entry) => (
            <div key={entry.id}>
              <strong>{entry.summary}</strong>
              <span>
                {entry.action.replaceAll('_', ' ')} · {entry.entityType.replaceAll('_', ' ')}
                {entry.entityId ? ` · ${entry.entityId}` : ''}
              </span>
              <span>
                {entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : 'Platform integration'} · {formatDate(entry.createdAt)}
              </span>
            </div>
          ))}
          {entries.length === 0 ? <p>No activity matches these filters.</p> : null}
        </Card>

        <nav className="manage-booking__document-actions" aria-label="Activity pages">
          {page > 1 ? <Link className="ui-button ui-button--secondary" href={activityPath(page - 1, query, action, entityType)}>Previous</Link> : null}
          {page < totalPages ? <Link className="ui-button ui-button--secondary" href={activityPath(page + 1, query, action, entityType)}>Next</Link> : null}
        </nav>
      </div>
    </section>
  );
}
