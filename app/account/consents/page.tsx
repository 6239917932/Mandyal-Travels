import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import {
  CUSTOMER_CONSENT_PAGE_SIZE,
  CUSTOMER_CONSENT_RESULT_LIMIT,
  CUSTOMER_CONSENT_STATUSES,
  customerConsentCurrentPosture,
  customerConsentHistoryWhere,
  customerConsentPath,
  customerConsentPolicyEvidence,
  customerConsentPurpose,
  customerConsentSource,
  customerConsentStatus,
  normalizeCustomerConsentFilters,
} from '@/services/customerConsentCenterService';

export const metadata: Metadata = { title: 'My consent history' };

type SearchValue = string | string[] | undefined;
type CustomerConsentsPageProps = {
  searchParams: Promise<{
    page?: SearchValue;
    status?: SearchValue;
  }>;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

export default async function CustomerConsentsPage({ searchParams }: CustomerConsentsPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=%2Faccount%2Fconsents');

  const filters = normalizeCustomerConsentFilters(await searchParams);
  const where = customerConsentHistoryWhere(user.id, filters.status);
  const [matchingCount, grantedCount, withdrawnCount, latestMarketingConsent] = await Promise.all([
    prisma.userConsentRecord.count({ where }),
    prisma.userConsentRecord.count({ where: { status: 'GRANTED', userId: user.id } }),
    prisma.userConsentRecord.count({ where: { status: 'WITHDRAWN', userId: user.id } }),
    prisma.userConsentRecord.findFirst({
      orderBy: [{ recordedAt: 'desc' }, { id: 'asc' }],
      select: { policyVersion: true, recordedAt: true, status: true },
      where: { purpose: 'MARKETING_COMMUNICATIONS', userId: user.id },
    }),
  ]);
  const boundedCount = Math.min(matchingCount, CUSTOMER_CONSENT_RESULT_LIMIT);
  const pageCount = Math.max(1, Math.ceil(boundedCount / CUSTOMER_CONSENT_PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const records = await prisma.userConsentRecord.findMany({
    orderBy: [{ recordedAt: 'desc' }, { id: 'asc' }],
    select: {
      policyVersion: true,
      purpose: true,
      recordedAt: true,
      source: true,
      status: true,
      withdrawnAt: true,
    },
    skip: (page - 1) * CUSTOMER_CONSENT_PAGE_SIZE,
    take: CUSTOMER_CONSENT_PAGE_SIZE,
    where,
  });
  const currentPosture = customerConsentCurrentPosture(latestMarketingConsent);
  const activeFilters = { ...filters, page };

  return (
    <section className="account-page">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Privacy evidence</p>
          <h1>My consent history</h1>
          <p>Review consent evidence recorded for your signed-in account.</p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/account">
          Back to my account
        </Link>
      </div>

      <div className="partner-bookings__summary">
        <Card>
          <span>Matching records</span>
          <strong>{matchingCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Granted records</span>
          <strong>{grantedCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Withdrawn records</span>
          <strong>{withdrawnCount.toLocaleString('en-IN')}</strong>
        </Card>
      </div>

      <Card className="ui-card--padded">
        <p className="hotel-page__eyebrow">Current marketing posture</p>
        {currentPosture && latestMarketingConsent ? (
          <>
            <h2>{currentPosture.label}</h2>
            <p>
              Based on the latest marketing consent evidence recorded{' '}
              <time dateTime={latestMarketingConsent.recordedAt.toISOString()}>
                {formatDate(latestMarketingConsent.recordedAt)}
              </time>
              .
            </p>
            {customerConsentPolicyEvidence(latestMarketingConsent.policyVersion)
              .pendingLegalApproval ? (
              <p>
                The legal wording associated with this draft policy version is pending approval.
                This history is evidence of the account action, not legal advice.
              </p>
            ) : null}
          </>
        ) : (
          <>
            <h2>No marketing consent evidence recorded</h2>
            <p>No permission or withdrawal is inferred when an evidence record is absent.</p>
          </>
        )}
      </Card>

      <form className="business-report__filters" method="get">
        <label className="ui-field">
          <span className="ui-field__label">Status</span>
          <select className="ui-input" defaultValue={filters.status} name="status">
            {CUSTOMER_CONSENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === 'ALL' ? 'All statuses' : customerConsentStatus(status).label}
              </option>
            ))}
          </select>
        </label>
        <div className="business-report__filter-actions">
          <button className="ui-button ui-button--primary" type="submit">
            Apply filter
          </button>
          <Link className="ui-button ui-button--secondary" href="/account/consents">
            Clear
          </Link>
        </div>
      </form>

      {matchingCount > CUSTOMER_CONSENT_RESULT_LIMIT ? (
        <Card className="ui-card--padded">
          <strong>Showing a bounded consent history.</strong>
          <p>Refine the status filter to find records outside the first 500 matches.</p>
        </Card>
      ) : null}

      <div className="account-trips__list">
        {records.map((record, index) => {
          const status = customerConsentStatus(record.status);
          const policy = customerConsentPolicyEvidence(record.policyVersion);
          return (
            <Card
              className="account-trip ui-card--padded"
              key={`${record.recordedAt.toISOString()}-${record.purpose}-${record.status}-${index}`}
            >
              <div className="account-trip__topline">
                <h2>{customerConsentPurpose(record.purpose)}</h2>
                <strong>{status.label}</strong>
              </div>
              <dl className="account-trip__body">
                <div>
                  <dt>Recorded</dt>
                  <dd>
                    <time dateTime={record.recordedAt.toISOString()}>
                      {formatDate(record.recordedAt)}
                    </time>
                  </dd>
                </div>
                <div>
                  <dt>Recorded through</dt>
                  <dd>{customerConsentSource(record.source)}</dd>
                </div>
                <div>
                  <dt>Policy version</dt>
                  <dd>{policy.label}</dd>
                </div>
                {record.withdrawnAt ? (
                  <div>
                    <dt>Withdrawn</dt>
                    <dd>
                      <time dateTime={record.withdrawnAt.toISOString()}>
                        {formatDate(record.withdrawnAt)}
                      </time>
                    </dd>
                  </div>
                ) : null}
              </dl>
              {policy.pendingLegalApproval ? (
                <p>The legal wording for this draft policy version is pending approval.</p>
              ) : null}
            </Card>
          );
        })}
        {records.length === 0 ? (
          <Card className="account-trips__empty ui-card--padded">
            <strong>No consent evidence matches this filter.</strong>
            <p>No permission or withdrawal is inferred from an empty result.</p>
          </Card>
        ) : null}
      </div>

      <nav aria-label="Consent history pages" className="business-audit-pagination">
        {page > 1 ? (
          <Link
            className="ui-button ui-button--secondary"
            href={customerConsentPath(activeFilters, page - 1)}
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
            href={customerConsentPath(activeFilters, page + 1)}
          >
            Next page
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <Card className="ui-card--padded">
        <strong>This page is read-only.</strong>
        <p>
          Viewing this history does not grant, withdraw, or otherwise change consent or messaging
          preferences.
        </p>
        <Link href="/legal/privacy">Read the current privacy notice</Link>
      </Card>
    </section>
  );
}
