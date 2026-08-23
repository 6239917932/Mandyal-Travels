import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import {
  hasConfiguredSecret,
  integrationPosture,
  integrationPostureLabel,
} from '@/services/adminIntegrationRegistryService';

export const metadata: Metadata = { title: 'Integration registry' };

function dateLabel(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
    : 'Not checked';
}

export default async function AdminIntegrationsPage() {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/integrations');

  const [hotelConnections, flightConnections, deliveryGroups, outboxGroups] = await Promise.all([
    prisma.hotelChannelConnection.findMany({
      include: {
        partner: { select: { name: true } },
        propertyMappings: { select: { id: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    }),
    prisma.flightSupplierConnection.findMany({
      include: { partner: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    }),
    prisma.notificationDelivery.groupBy({
      by: ['channel', 'status'],
      _count: { _all: true },
      orderBy: [{ channel: 'asc' }, { status: 'asc' }],
    }),
    prisma.integrationOutboxEvent.groupBy({
      by: ['status'],
      _count: { _all: true },
      orderBy: { status: 'asc' },
    }),
  ]);

  const supplierConnections = hotelConnections.length + flightConnections.length;
  const supplierAttention =
    hotelConnections.filter(
      (item) => integrationPosture(item.status, item.lastHealthStatus) === 'ATTENTION',
    ).length +
    flightConnections.filter(
      (item) => integrationPosture(item.status, item.lastHealthStatus) === 'ATTENTION',
    ).length;
  const deliveryTotal = deliveryGroups.reduce((total, group) => total + group._count._all, 0);
  const outboxAttention = outboxGroups
    .filter((group) => group.status === 'DEAD_LETTER')
    .reduce((total, group) => total + group._count._all, 0);

  return (
    <section className="account-page business-report admin-workspace">
      <header className="admin-hero">
        <div>
          <p className="hotel-page__eyebrow">Protected provider posture</p>
          <h1>Integration registry</h1>
          <p>
            Review supplier configuration and delivery-pipeline health without exposing credentials
            or activating external providers.
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/admin">
          Operations console
        </Link>
      </header>

      <div className="partner-bookings__summary">
        <Card>
          <strong>{supplierConnections}</strong>
          <span>Supplier connections (latest 100 per type)</span>
        </Card>
        <Card>
          <strong>{supplierAttention}</strong>
          <span>Supplier connections needing attention</span>
        </Card>
        <Card>
          <strong>{deliveryTotal}</strong>
          <span>Recorded notification deliveries</span>
        </Card>
        <Card>
          <strong>{outboxAttention}</strong>
          <span>Dead-letter integration events</span>
        </Card>
      </div>

      <section className="admin-section-block" aria-labelledby="hotel-integrations">
        <div className="admin-section-block__heading">
          <div>
            <p className="hotel-page__eyebrow">Hotel distribution</p>
            <h2 id="hotel-integrations">Channel connections</h2>
          </div>
          <span>{hotelConnections.length} shown</span>
        </div>
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th scope="col">Partner</th>
                  <th scope="col">Provider</th>
                  <th scope="col">Configuration</th>
                  <th scope="col">Health</th>
                  <th scope="col">Mappings</th>
                  <th scope="col">Last check</th>
                </tr>
              </thead>
              <tbody>
                {hotelConnections.length ? (
                  hotelConnections.map((connection) => {
                    const posture = integrationPosture(
                      connection.status,
                      connection.lastHealthStatus,
                    );
                    return (
                      <tr key={connection.id}>
                        <td>{connection.partner.name}</td>
                        <td>{connection.providerName}</td>
                        <td>
                          {connection.authenticationMode} ·{' '}
                          {hasConfiguredSecret(connection.externalAccountRef)
                            ? 'Reference configured'
                            : 'Reference missing'}
                        </td>
                        <td>
                          <span className="admin-status-badge">
                            {integrationPostureLabel(posture)}
                          </span>{' '}
                          {connection.status} / {connection.lastHealthStatus}
                        </td>
                        <td>{connection.propertyMappings.length}</td>
                        <td>{dateLabel(connection.lastHealthAt)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6}>No hotel channel connections are configured.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section className="admin-section-block" aria-labelledby="flight-integrations">
        <div className="admin-section-block__heading">
          <div>
            <p className="hotel-page__eyebrow">Flight supply</p>
            <h2 id="flight-integrations">Supplier connections</h2>
          </div>
          <span>{flightConnections.length} shown</span>
        </div>
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th scope="col">Partner</th>
                  <th scope="col">Supplier</th>
                  <th scope="col">Environment</th>
                  <th scope="col">Credential</th>
                  <th scope="col">Health</th>
                  <th scope="col">Last check</th>
                </tr>
              </thead>
              <tbody>
                {flightConnections.length ? (
                  flightConnections.map((connection) => {
                    const posture = integrationPosture(
                      connection.status,
                      connection.lastHealthStatus,
                    );
                    return (
                      <tr key={connection.id}>
                        <td>{connection.partner.name}</td>
                        <td>
                          {connection.displayName} ({connection.providerCode})
                        </td>
                        <td>{connection.environment}</td>
                        <td>
                          {hasConfiguredSecret(connection.credentialRef)
                            ? 'Secret reference configured'
                            : 'Secret reference missing'}
                        </td>
                        <td>
                          <span className="admin-status-badge">
                            {integrationPostureLabel(posture)}
                          </span>{' '}
                          {connection.status} / {connection.lastHealthStatus}
                        </td>
                        <td>{dateLabel(connection.lastHealthAt)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6}>No flight supplier connections are configured.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section className="admin-section-block" aria-labelledby="pipeline-health">
        <div className="admin-section-block__heading">
          <div>
            <p className="hotel-page__eyebrow">Asynchronous delivery</p>
            <h2 id="pipeline-health">Pipeline health</h2>
          </div>
          <Link className="admin-directory-link" href="/admin/operations">
            Open exception queues
          </Link>
        </div>
        <div className="partner-bookings__summary">
          {deliveryGroups.map((group) => (
            <Card key={`${group.channel}-${group.status}`}>
              <strong>{group._count._all}</strong>
              <span>
                {group.channel} notifications · {group.status}
              </span>
            </Card>
          ))}
          {outboxGroups.map((group) => (
            <Card key={`outbox-${group.status}`}>
              <strong>{group._count._all}</strong>
              <span>Integration outbox · {group.status}</span>
            </Card>
          ))}
          {!deliveryGroups.length && !outboxGroups.length ? (
            <Card>
              <strong>Clear</strong>
              <span>No notification or integration events have been recorded.</span>
            </Card>
          ) : null}
        </div>
      </section>
    </section>
  );
}
