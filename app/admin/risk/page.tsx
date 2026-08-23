import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Prisma } from '@/generated/prisma/client';

import { AdminRiskSignalActions } from '@/components/admin/AdminOperationsQueueActions';
import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import {
  ADMIN_RISK_PAGE_SIZE,
  ADMIN_RISK_RESULT_LIMIT,
  ADMIN_RISK_SEVERITIES,
  ADMIN_RISK_STATUSES,
  ADMIN_RISK_WINDOWS,
  adminRiskPath,
  normalizeAdminRiskFilters,
  privateSubjectReference,
  redactRiskNarrative,
  riskReviewPosture,
  riskWindowStart,
} from '@/services/adminRiskWorkbenchService';

export const metadata: Metadata = { title: 'Risk review workbench' };

type SearchValue = string | string[] | undefined;
type Props = {
  searchParams: Promise<{
    page?: SearchValue;
    q?: SearchValue;
    severity?: SearchValue;
    status?: SearchValue;
    window?: SearchValue;
  }>;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    value,
  );
}

export default async function AdminRiskPage({ searchParams }: Props) {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/risk');

  const filters = normalizeAdminRiskFilters(await searchParams);
  const now = new Date();
  const start = riskWindowStart(filters.window, now);
  const where: Prisma.RiskSignalWhereInput = {
    ...(filters.status === 'ALL' ? {} : { status: filters.status }),
    ...(filters.severity === 'ALL' ? {} : { severity: filters.severity }),
    ...(start ? { createdAt: { gte: start } } : {}),
    ...(filters.query
      ? {
          OR: [
            { id: { contains: filters.query } },
            { signalType: { contains: filters.query } },
            { source: { contains: filters.query } },
            { subjectType: { contains: filters.query } },
            { subjectId: { contains: filters.query } },
          ],
        }
      : {}),
  };

  const agingCutoff = new Date(now.getTime() - 72 * 60 * 60 * 1000);
  const [matchingCount, openCount, escalatedCount, agingCount] = await Promise.all([
    prisma.riskSignal.count({ where }),
    prisma.riskSignal.count({ where: { status: 'OPEN' } }),
    prisma.riskSignal.count({
      where: { severity: { in: ['CRITICAL', 'HIGH'] }, status: 'OPEN' },
    }),
    prisma.riskSignal.count({ where: { createdAt: { lte: agingCutoff }, status: 'OPEN' } }),
  ]);
  const boundedCount = Math.min(matchingCount, ADMIN_RISK_RESULT_LIMIT);
  const pageCount = Math.max(1, Math.ceil(boundedCount / ADMIN_RISK_PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const signals = await prisma.riskSignal.findMany({
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      createdAt: true,
      id: true,
      resolutionNote: true,
      reviewedAt: true,
      severity: true,
      signalType: true,
      source: true,
      status: true,
      subjectId: true,
      subjectType: true,
      summary: true,
    },
    skip: (page - 1) * ADMIN_RISK_PAGE_SIZE,
    take: ADMIN_RISK_PAGE_SIZE,
    where,
  });
  const activeFilters = { ...filters, page };

  return (
    <section className="account-page business-report admin-workspace">
      <header className="admin-hero">
        <div className="admin-hero__content">
          <p className="admin-hero__eyebrow">Human-governed suspicious-activity review</p>
          <h1>Risk review workbench</h1>
          <p>
            Triage bounded account, booking, supplier, and payment-risk signals without exposing raw
            evidence or allowing automated adverse action.
          </p>
          <div className="admin-hero__actions">
            <Link className="ui-button ui-button--secondary" href="/admin/operations">
              Exception queues
            </Link>
            <Link className="ui-button ui-button--secondary" href="/admin/audit">
              Audit workbench
            </Link>
            <Link className="ui-button ui-button--secondary" href="/admin">
              Back to operations
            </Link>
          </div>
        </div>
      </header>

      <form className="business-report__filters" method="get">
        <label className="ui-field business-report__search">
          <span className="ui-field__label">Signal, source, or internal subject</span>
          <input
            className="ui-input"
            defaultValue={filters.query}
            maxLength={100}
            name="q"
            placeholder="Signal type, source, subject type, or exact ID"
            type="search"
          />
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Status</span>
          <select className="ui-input" defaultValue={filters.status} name="status">
            {ADMIN_RISK_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item === 'ALL' ? 'All statuses' : item}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Severity</span>
          <select className="ui-input" defaultValue={filters.severity} name="severity">
            {ADMIN_RISK_SEVERITIES.map((item) => (
              <option key={item} value={item}>
                {item === 'ALL' ? 'All severities' : item}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Created within</span>
          <select className="ui-input" defaultValue={filters.window} name="window">
            {ADMIN_RISK_WINDOWS.map((item) => (
              <option key={item} value={item}>
                {item === 'ALL' ? 'All retained history' : `${item} days`}
              </option>
            ))}
          </select>
        </label>
        <div className="business-report__filter-actions">
          <button className="ui-button ui-button--primary" type="submit">
            Apply filters
          </button>
          <Link className="ui-button ui-button--secondary" href="/admin/risk">
            Clear
          </Link>
        </div>
      </form>

      <div className="partner-bookings__summary">
        <Card>
          <span>Open signals</span>
          <strong>{openCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card className={escalatedCount ? 'admin-metric--attention' : 'admin-metric--clear'}>
          <span>Open high or critical</span>
          <strong>{escalatedCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card className={agingCount ? 'admin-metric--attention' : 'admin-metric--clear'}>
          <span>Open over 72 hours</span>
          <strong>{agingCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Matching records</span>
          <strong>{matchingCount.toLocaleString('en-IN')}</strong>
        </Card>
      </div>

      {matchingCount > ADMIN_RISK_RESULT_LIMIT ? (
        <Card className="ui-card--padded">
          <strong>Deep-history limit reached.</strong>
          <p>
            Refine the filters to review records beyond the first{' '}
            {ADMIN_RISK_RESULT_LIMIT.toLocaleString('en-IN')} matches.
          </p>
        </Card>
      ) : null}

      <div className="account-trips__list">
        {signals.map((signal) => {
          const posture = riskReviewPosture(signal.status, signal.createdAt, now);
          return (
            <Card className="ui-card--padded" key={signal.id}>
              <div className="account-trip__topline">
                <strong>
                  {signal.severity} · {signal.status}
                </strong>
                <span>{posture}</span>
              </div>
              <p>
                <strong>{signal.signalType}</strong> · {signal.source}
              </p>
              <p>{redactRiskNarrative(signal.summary) || 'No operator-safe summary recorded.'}</p>
              <p>
                {signal.subjectType} · Private reference{' '}
                {privateSubjectReference(signal.subjectType, signal.subjectId)} · Created{' '}
                {formatDate(signal.createdAt)}
              </p>
              {signal.reviewedAt ? <p>Reviewed {formatDate(signal.reviewedAt)}</p> : null}
              {signal.resolutionNote ? (
                <p>
                  <strong>Review note:</strong> {redactRiskNarrative(signal.resolutionNote)}
                </p>
              ) : null}
              {signal.status === 'OPEN' ? (
                <AdminRiskSignalActions signalId={signal.id} />
              ) : (
                <p>Human review completed. This record is retained for audit.</p>
              )}
            </Card>
          );
        })}
        {signals.length === 0 ? (
          <Card className="ui-card--padded">
            <strong>No risk signals match these filters.</strong>
            <p>No automatic clearance or adverse action has been taken.</p>
          </Card>
        ) : null}
      </div>

      <nav aria-label="Risk review pages" className="business-audit-pagination">
        {page > 1 ? (
          <Link
            className="ui-button ui-button--secondary"
            href={adminRiskPath(activeFilters, page - 1)}
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
            href={adminRiskPath(activeFilters, page + 1)}
          >
            Next page
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </section>
  );
}
