import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { loadAdminBookingDossier } from '@/services/adminBookingDossierService';
import type { AdminDocumentReadiness } from '@/types/adminBookingDossier';

import styles from './page.module.css';

export const metadata: Metadata = { title: 'Booking dossier' };

type AdminBookingDossierPageProps = {
  params: Promise<{ confirmationCode: string }>;
};

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

function date(value: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

function readiness(value: AdminDocumentReadiness): string {
  return value === 'UNAVAILABLE' ? 'NOT AVAILABLE' : value;
}

export default async function AdminBookingDossierPage({ params }: AdminBookingDossierPageProps) {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/bookings');

  const { confirmationCode } = await params;
  const dossier = await loadAdminBookingDossier(confirmationCode);
  if (!dossier) notFound();

  return (
    <section className={`account-page admin-workspace ${styles.page}`}>
      <header className={`admin-hero ${styles.hero}`}>
        <div>
          <p className="admin-hero__eyebrow">Read-only operational evidence</p>
          <h1>Booking dossier</h1>
          <p>
            A governed summary for servicing this booking without changing travel, payment,
            inventory, amendment, refund, or support state.
          </p>
        </div>
        <div className={styles.heroActions}>
          <span className={styles.readOnlyBadge}>Read-only</span>
          <Link className="ui-button ui-button--secondary" href={dossier.links.directory}>
            Back to booking directory
          </Link>
        </div>
      </header>

      <div className={styles.identity}>
        <div>
          <span>Confirmation</span>
          <strong>{dossier.confirmationCode}</strong>
        </div>
        <div>
          <span>Product</span>
          <strong>{dossier.product}</strong>
        </div>
        <div>
          <span>Booking state</span>
          <strong>{dossier.status.toUpperCase()}</strong>
        </div>
        <div>
          <span>Recorded</span>
          <strong>
            <time dateTime={dossier.createdAt.toISOString()}>{date(dossier.createdAt)}</time>
          </strong>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <Card className={styles.summaryCard}>
          <span>Journey or stay</span>
          <strong>{dossier.title}</strong>
          <small>{dossier.subtitle}</small>
        </Card>
        <Card className={styles.summaryCard}>
          <span>Travel dates</span>
          <strong>{dossier.startDate}</strong>
          <small>{dossier.endDate ? `to ${dossier.endDate}` : 'Single service date'}</small>
        </Card>
        <Card className={styles.summaryCard}>
          <span>Recorded value</span>
          <strong>{money(dossier.totalAmount, dossier.currency)}</strong>
          <small>Booking record total</small>
        </Card>
        <Card className={styles.summaryCard}>
          <span>Operational state</span>
          <strong>{dossier.operationalStatus?.replaceAll('_', ' ') ?? 'Product managed'}</strong>
          <small>No state can be changed here</small>
        </Card>
      </div>

      <div className={styles.twoColumn}>
        <Card className={styles.sectionCard}>
          <div className={styles.sectionHeading}>
            <div>
              <p className="hotel-page__eyebrow">Customer context</p>
              <h2>Traveller</h2>
            </div>
            <Link href={dossier.links.customer}>Open customer workbench</Link>
          </div>
          <dl className={styles.facts}>
            <div>
              <dt>Name</dt>
              <dd>{dossier.traveller.displayName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{dossier.traveller.email || 'Email record unavailable'}</dd>
            </div>
            {dossier.facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className={styles.sectionCard}>
          <div className={styles.sectionHeading}>
            <div>
              <p className="hotel-page__eyebrow">Customer document posture</p>
              <h2>Document readiness</h2>
            </div>
            <Link href={dossier.links.documents}>Open document workbench</Link>
          </div>
          <div className={styles.readinessGrid}>
            <div>
              <span>Confirmation</span>
              <strong data-readiness={dossier.documents.confirmation}>
                {readiness(dossier.documents.confirmation)}
              </strong>
            </div>
            <div>
              <span>Billing receipt</span>
              <strong data-readiness={dossier.documents.billing}>
                {readiness(dossier.documents.billing)}
              </strong>
            </div>
          </div>
          <p>{dossier.documents.reason}</p>
          <small>
            Readiness is evidence guidance only. Documents are generated or reviewed in their
            existing governed workbench.
          </small>
        </Card>
      </div>

      <Card className={styles.sectionCard}>
        <div className={styles.sectionHeading}>
          <div>
            <p className="hotel-page__eyebrow">Servicing requests</p>
            <h2>Amendment evidence</h2>
          </div>
          {dossier.links.amendments ? (
            <Link href={dossier.links.amendments}>Open amendment queue</Link>
          ) : null}
        </div>
        {!dossier.amendments.available ? (
          <p>Amendment records are not stored for this product in the local portal.</p>
        ) : dossier.amendments.items.length === 0 ? (
          <p>No hotel amendment requests are recorded.</p>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Requested stay</th>
                  <th>Status</th>
                  <th>Requested value</th>
                  <th>Recorded</th>
                </tr>
              </thead>
              <tbody>
                {dossier.amendments.items.map((item) => (
                  <tr key={`${item.createdAt.toISOString()}-${item.requestedCheckInDate}`}>
                    <td>
                      {item.requestedCheckInDate} to {item.requestedCheckOutDate}
                    </td>
                    <td>{item.status}</td>
                    <td>
                      {item.requestedTotalAmount === null
                        ? 'No revised value recorded'
                        : money(item.requestedTotalAmount, dossier.currency)}
                    </td>
                    <td>
                      <time dateTime={item.createdAt.toISOString()}>{date(item.createdAt)}</time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className={styles.countNote}>
          {dossier.amendments.total.toLocaleString('en-IN')} total amendment record(s)
          {dossier.amendments.total > dossier.amendments.items.length
            ? ` · Showing the latest ${dossier.amendments.items.length}`
            : ''}
        </p>
      </Card>

      <div className={styles.twoColumn}>
        <Card className={styles.sectionCard}>
          <div className={styles.sectionHeading}>
            <div>
              <p className="hotel-page__eyebrow">Money return evidence</p>
              <h2>Refund summary</h2>
            </div>
            {dossier.links.finance ? <Link href={dossier.links.finance}>Open finance</Link> : null}
          </div>
          {!dossier.refunds.available ? (
            <p>Refund records are not stored for this product in the local portal.</p>
          ) : dossier.refunds.items.length === 0 ? (
            <p>No refund requests are recorded.</p>
          ) : (
            <ul className={styles.activityList}>
              {dossier.refunds.items.map((item) => (
                <li key={`${item.createdAt.toISOString()}-${item.amount}`}>
                  <div>
                    <strong>{money(item.amount, item.currency)}</strong>
                    <span>{item.status}</span>
                  </div>
                  <time dateTime={item.createdAt.toISOString()}>{date(item.createdAt)}</time>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.countNote}>
            {dossier.refunds.total.toLocaleString('en-IN')} total refund record(s)
            {dossier.refunds.total > dossier.refunds.items.length
              ? ` · Showing the latest ${dossier.refunds.items.length}`
              : ''}
          </p>
        </Card>

        <Card className={styles.sectionCard}>
          <div className={styles.sectionHeading}>
            <div>
              <p className="hotel-page__eyebrow">Human support evidence</p>
              <h2>Support cases</h2>
            </div>
            <Link href={dossier.links.support}>Open support workbench</Link>
          </div>
          {dossier.support.items.length === 0 ? (
            <p>No customer support cases are linked to this booking.</p>
          ) : (
            <ul className={styles.activityList}>
              {dossier.support.items.map((item) => (
                <li key={item.caseNumber}>
                  <div>
                    <strong>{item.caseNumber}</strong>
                    <span>
                      {item.category} · {item.status}
                    </span>
                  </div>
                  <time dateTime={item.updatedAt.toISOString()}>{date(item.updatedAt)}</time>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.countNote}>
            {dossier.support.total.toLocaleString('en-IN')} total linked support case(s)
            {dossier.support.total > dossier.support.items.length
              ? ` · Showing the latest ${dossier.support.items.length}`
              : ''}
          </p>
        </Card>
      </div>

      <Card className={styles.boundary}>
        <strong>Evidence, not authority</strong>
        <p>
          This dossier cannot amend or cancel travel, operate a refund, change inventory, create a
          document, or resolve a support case. Use the linked specialist workbench, where existing
          permissions, validation, and audit controls continue to apply.
        </p>
      </Card>
    </section>
  );
}
