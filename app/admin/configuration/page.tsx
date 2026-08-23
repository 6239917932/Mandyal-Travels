import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminFeatureFlagControl } from '@/components/admin/AdminFeatureFlagControl';
import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { getPlatformFeatureStates } from '@/services/platformFeatureFlagService';

export const metadata: Metadata = { title: 'Platform configuration' };

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    value,
  );
}

export default async function AdminConfigurationPage() {
  const administrator = await getPlatformAdmin();
  if (!administrator) redirect('/login?returnTo=/admin/configuration');

  const [features, events] = await Promise.all([
    getPlatformFeatureStates(),
    prisma.platformFeatureFlagEvent.findMany({
      include: { actor: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
  ]);

  return (
    <section className="account-page platform-admin-page admin-workspace">
      <header className="admin-hero">
        <div className="admin-hero__content">
          <p className="admin-hero__eyebrow">Audited release controls</p>
          <h1>Platform configuration</h1>
          <p>
            Pause or restore selected public entry points without changing bookings, payments, or
            existing partner access. Every change requires a reason and is retained in history.
          </p>
          <Link className="ui-button ui-button--secondary" href="/admin">
            Back to operations
          </Link>
        </div>
      </header>

      <div className="account-trips__list">
        {features.map((feature) => (
          <Card className="account-trip" key={feature.key}>
            <div className="account-trip__topline">
              <span className="account-trip__type">{feature.key}</span>
              <strong>{feature.enabled ? 'ACTIVE' : 'PAUSED'}</strong>
            </div>
            <div className="account-trip__body">
              <div>
                <h2>{feature.label}</h2>
                <p>{feature.description}</p>
                <p>Configuration version {feature.version}</p>
              </div>
            </div>
            <AdminFeatureFlagControl
              enabled={feature.enabled}
              featureKey={feature.key}
              version={feature.version}
            />
          </Card>
        ))}
      </div>

      <Card className="business-report__table-card">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Append-only history</p>
          <h2>Recent configuration changes</h2>
        </div>
        <div className="business-report__table-scroll">
          <table className="business-report__table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>State</th>
                <th>Reason</th>
                <th>Administrator</th>
                <th>Changed</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{event.flagKey}</td>
                  <td>
                    {event.enabled ? 'ACTIVE' : 'PAUSED'} · v{event.version}
                  </td>
                  <td>{event.reason}</td>
                  <td>
                    {event.actor.firstName} {event.actor.lastName}
                    <span>{event.actor.email}</span>
                  </td>
                  <td>{formatDate(event.createdAt)}</td>
                </tr>
              ))}
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5}>No configuration changes have been recorded.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
