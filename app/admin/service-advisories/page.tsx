import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminServiceAdvisoryActions } from '@/components/admin/AdminServiceAdvisoryActions';
import { AdminServiceAdvisoryCreate } from '@/components/admin/AdminServiceAdvisoryCreate';
import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import {
  isServiceAdvisoryStatus,
  serviceAdvisoryAllowedTransitions,
} from '@/services/serviceAdvisoryPolicy';

export const metadata: Metadata = { title: 'Service advisories' };

function formatDate(value: Date | null) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

export default async function AdminServiceAdvisoriesPage() {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/service-advisories');

  const [advisories, events] = await Promise.all([
    prisma.serviceAdvisory.findMany({
      include: { createdBy: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.serviceAdvisoryEvent.findMany({
      include: {
        actor: { select: { email: true, firstName: true, lastName: true } },
        advisory: { select: { publicReference: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  return (
    <section className="account-page platform-admin-page admin-workspace">
      <header className="admin-hero">
        <div className="admin-hero__content">
          <p className="admin-hero__eyebrow">Audited customer communications</p>
          <h1>Service advisories</h1>
          <p>
            Publish scoped service notices across the portal, schedule their visibility, and retain
            an append-only record of every lifecycle decision.
          </p>
          <Link className="ui-button ui-button--secondary" href="/admin">
            Back to operations
          </Link>
        </div>
      </header>

      <Card className="advisory-admin-card">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Create governed notice</p>
          <h2>New service advisory</h2>
          <p>Draft privately, publish immediately, or schedule a future customer notice.</p>
        </div>
        <AdminServiceAdvisoryCreate />
      </Card>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Current register</p>
          <h2>Advisory lifecycle</h2>
        </div>
        <div className="account-trips__list">
          {advisories.map((advisory) => {
            const allowedStatuses = isServiceAdvisoryStatus(advisory.status)
              ? serviceAdvisoryAllowedTransitions(advisory.status)
              : [];
            return (
              <Card className="account-trip advisory-admin-card" key={advisory.id}>
                <div className="account-trip__topline">
                  <span className="account-trip__type">
                    {advisory.publicReference} · {advisory.surface} · {advisory.severity}
                  </span>
                  <strong>
                    {advisory.status} · v{advisory.version}
                  </strong>
                </div>
                <div className="account-trip__body">
                  <div>
                    <h2>{advisory.title}</h2>
                    <p>{advisory.message}</p>
                    <p>
                      Starts {formatDate(advisory.startsAt)} · Ends {formatDate(advisory.endsAt)}
                    </p>
                    <p>
                      Created by {advisory.createdBy.firstName} {advisory.createdBy.lastName} (
                      {advisory.createdBy.email})
                    </p>
                  </div>
                </div>
                <AdminServiceAdvisoryActions
                  advisoryId={advisory.id}
                  allowedStatuses={allowedStatuses}
                  version={advisory.version}
                />
              </Card>
            );
          })}
          {advisories.length === 0 ? <Card>No service advisories have been created.</Card> : null}
        </div>
      </div>

      <Card className="business-report__table-card">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Append-only history</p>
          <h2>Recent advisory events</h2>
        </div>
        <div className="business-report__table-scroll">
          <table className="business-report__table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Action</th>
                <th>Reason</th>
                <th>Administrator</th>
                <th>Recorded</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{event.advisory.publicReference}</td>
                  <td>{event.action}</td>
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
                  <td colSpan={5}>No advisory events have been recorded.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
