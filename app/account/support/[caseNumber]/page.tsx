import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import { getCustomerSupportCaseDetail } from '@/services/customerSupportCaseDetailService';

import styles from './page.module.css';

export const metadata: Metadata = { title: 'Support case details' };

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

export default async function CustomerSupportCaseDetailPage({
  params,
}: {
  params: Promise<{ caseNumber: string }>;
}) {
  const { caseNumber } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?returnTo=${encodeURIComponent(`/account/support/${caseNumber}`)}`);
  }

  const supportCase = await getCustomerSupportCaseDetail({ caseNumber, userId: user.id });
  if (!supportCase) notFound();

  return (
    <section className={`account-page ${styles.page}`}>
      <div className={styles.heading}>
        <div>
          <p className="hotel-page__eyebrow">Support case</p>
          <h1>{supportCase.subject}</h1>
          <p>
            {supportCase.caseNumber} · {supportCase.categoryLabel}
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/account/support">
          Back to customer support
        </Link>
      </div>

      <div className={styles.layout}>
        <div className={styles.details}>
          <Card>
            <div className={styles.summary}>
              <div>
                <span>Status</span>
                <strong>{supportCase.statusLabel}</strong>
              </div>
              <div>
                <span>Created</span>
                <time dateTime={supportCase.createdAt.toISOString()}>
                  {formatDate(supportCase.createdAt)}
                </time>
              </div>
              <div>
                <span>Last updated</span>
                <time dateTime={supportCase.updatedAt.toISOString()}>
                  {formatDate(supportCase.updatedAt)}
                </time>
              </div>
              {supportCase.bookingReference ? (
                <div>
                  <span>Booking reference</span>
                  <strong>{supportCase.bookingReference}</strong>
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <h2>Your request</h2>
            <p className={styles.message}>{supportCase.message}</p>
          </Card>

          {supportCase.resolutionNote ? (
            <Card>
              <h2>Resolution</h2>
              <p className={styles.message}>{supportCase.resolutionNote}</p>
            </Card>
          ) : null}
        </div>

        <Card className={styles.timeline}>
          <h2>Case timeline</h2>
          <p>Customer-visible milestones recorded for this case.</p>
          {supportCase.hasEarlierEvents ? (
            <p className={styles.notice} role="status">
              Showing the 100 most recent updates.
            </p>
          ) : null}
          {supportCase.events.length > 0 ? (
            <ol>
              {supportCase.events.map((event, index) => (
                <li key={`${event.recordedAt.toISOString()}-${index}`}>
                  <span aria-hidden="true" />
                  <div>
                    <strong>{event.label}</strong>
                    <time dateTime={event.recordedAt.toISOString()}>
                      {formatDate(event.recordedAt)}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.empty}>No customer-visible updates are recorded yet.</p>
          )}
        </Card>
      </div>
    </section>
  );
}
