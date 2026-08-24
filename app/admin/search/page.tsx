import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminSearchProjectionManager } from '@/components/admin/AdminSearchProjectionManager';
import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { getHotelSearchProjectionHealth } from '@/services/searchProjectionService';

export const metadata: Metadata = { title: 'Search operations' };

function formatDate(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
    : 'Not built yet';
}

export default async function AdminSearchPage() {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/search');

  const [health, rebuilds] = await Promise.all([
    getHotelSearchProjectionHealth(),
    prisma.searchProjectionRebuildEvent.findMany({
      include: { actor: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      where: { entityType: 'HOTEL' },
    }),
  ]);

  return (
    <section className="account-page business-report admin-workspace">
      <header className="admin-hero">
        <div className="admin-hero__content">
          <p className="admin-hero__eyebrow">Governed discovery operations</p>
          <h1>Search health</h1>
          <p>
            Compare published hotel records with their disposable search projections and rebuild
            only when the governed health evidence requires it.
          </p>
          <div className="admin-hero__actions">
            <Link className="ui-button ui-button--secondary" href="/admin/audit?domain=OPERATIONS">
              View operations audit
            </Link>
            <Link className="ui-button ui-button--secondary" href="/admin">
              Operations console
            </Link>
          </div>
        </div>
        <div className="admin-hero__posture">
          <span className="admin-hero__secure">Administrator only</span>
          <strong>{health.status}</strong>
          <span>Latest projection: {formatDate(health.latestProjectedAt)}</span>
        </div>
      </header>

      <div className="partner-bookings__summary" aria-label="Hotel search projection health">
        <Card
          className={
            health.status === 'HEALTHY' ? 'admin-metric--clear' : 'admin-metric--attention'
          }
        >
          <span>Health</span>
          <strong>{health.status}</strong>
        </Card>
        <Card>
          <span>Eligible hotels</span>
          <strong>{health.sourceCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Current projections</span>
          <strong>{health.currentCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card className={health.missingCount ? 'admin-metric--attention' : undefined}>
          <span>Missing</span>
          <strong>{health.missingCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card className={health.outdatedCount ? 'admin-metric--attention' : undefined}>
          <span>Outdated</span>
          <strong>{health.outdatedCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card className={health.staleCount ? 'admin-metric--attention' : undefined}>
          <span>Stale</span>
          <strong>{health.staleCount.toLocaleString('en-IN')}</strong>
        </Card>
      </div>

      {health.status === 'EMPTY' ? (
        <Card className="ui-card--padded">
          <strong>No eligible hotel search records exist.</strong>
          <p>Publish an active hotel before building search projections.</p>
        </Card>
      ) : null}

      <AdminSearchProjectionManager />

      <section className="account-trips" aria-labelledby="search-rebuild-history-heading">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Append-only accountability</p>
          <h2 id="search-rebuild-history-heading">Recent rebuilds</h2>
          <p>Successful rebuilds retain the operator, reason, and bounded result counts.</p>
        </div>
        <div className="account-trips__list">
          {rebuilds.map((event) => (
            <Card className="ui-card--padded" key={event.id}>
              <div className="account-trip__topline">
                <strong>{event.entityType} search rebuilt</strong>
                <time dateTime={event.createdAt.toISOString()}>{formatDate(event.createdAt)}</time>
              </div>
              <p>{event.reason}</p>
              <p>
                {event.projectedCount} projected · {event.removedCount} stale removed ·{' '}
                {event.sourceCount} eligible sources
              </p>
              <small>
                {event.actor.firstName} {event.actor.lastName} · {event.actor.email}
              </small>
            </Card>
          ))}
          {rebuilds.length === 0 ? (
            <Card className="ui-card--padded">
              <strong>No governed rebuild has been recorded.</strong>
              <p>The first successful, reasoned rebuild will appear here.</p>
            </Card>
          ) : null}
        </div>
      </section>
    </section>
  );
}
