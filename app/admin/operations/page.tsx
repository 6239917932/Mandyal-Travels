import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminIntegrationEventActions } from '@/components/admin/AdminOperationsQueueActions';
import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Exception operations' };

function date(value: Date) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    value,
  );
}

export default async function AdminOperationsPage() {
  const administrator = await getPlatformAdmin();
  if (!administrator) redirect('/login?returnTo=/admin/operations');
  const [events, deadLetters, openSignals] = await Promise.all([
    prisma.integrationOutboxEvent.findMany({
      orderBy: { createdAt: 'asc' },
      take: 100,
      where: { status: { in: ['PENDING', 'DEAD_LETTER'] } },
    }),
    prisma.integrationOutboxEvent.count({ where: { status: 'DEAD_LETTER' } }),
    prisma.riskSignal.count({ where: { status: 'OPEN' } }),
  ]);
  return (
    <section className="account-page platform-admin-page">
      <header className="admin-hero">
        <div className="admin-hero__content">
          <p className="admin-hero__eyebrow">Exception governance</p>
          <h1>Integration and suspicious-activity queues</h1>
          <p>
            Retry recoverable supplier events, retain dead-letter evidence, and require a recorded
            human decision for risk signals.
          </p>
          <Link className="ui-button ui-button--secondary" href="/admin">
            Back to operations
          </Link>
          <Link className="ui-button ui-button--secondary" href="/admin/risk">
            Open full risk workbench
          </Link>
        </div>
      </header>
      <div className="admin-overview-grid">
        <Card
          className={
            deadLetters
              ? 'admin-metric admin-metric--attention'
              : 'admin-metric admin-metric--clear'
          }
        >
          <span>Dead-letter events</span>
          <strong>{deadLetters}</strong>
        </Card>
        <Card
          className={
            openSignals
              ? 'admin-metric admin-metric--attention'
              : 'admin-metric admin-metric--clear'
          }
        >
          <span>Open risk signals</span>
          <strong>{openSignals}</strong>
        </Card>
        <Card className="admin-metric">
          <span>Queued retries</span>
          <strong>{events.filter((event) => event.status === 'PENDING').length}</strong>
        </Card>
      </div>
      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Supplier and channel delivery</p>
          <h2>Integration exceptions</h2>
        </div>
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Aggregate</th>
                  <th>Attempts</th>
                  <th>Error</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <strong>{event.eventType}</strong>
                      <span>{event.status}</span>
                      <span>{date(event.createdAt)}</span>
                    </td>
                    <td>
                      <strong>{event.aggregateType}</strong>
                      <span>{event.aggregateId}</span>
                    </td>
                    <td>
                      {event.attempts} / {event.maxAttempts}
                      <span>Next: {date(event.nextAttemptAt)}</span>
                    </td>
                    <td>{event.lastError || 'Awaiting delivery'}</td>
                    <td>
                      <AdminIntegrationEventActions eventId={event.id} />
                    </td>
                  </tr>
                ))}
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No integration exceptions require action.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </section>
  );
}
