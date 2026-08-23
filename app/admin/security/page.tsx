import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import type { Prisma } from '@/generated/prisma/client';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import {
  ADMIN_SECURITY_PAGE_SIZE,
  ADMIN_SECURITY_RESULT_LIMIT,
  adminSecurityPath,
  normalizeAdminSecurityFilters,
  rateLimitPosture,
  securityCoverage,
} from '@/services/adminSecurityPostureService';

export const metadata: Metadata = { title: 'Security operations posture' };

type PageProps = {
  searchParams: Promise<{
    action?: string | string[];
    page?: string | string[];
    state?: string | string[];
  }>;
};

function dateLabel(value: Date) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    value,
  );
}

function label(value: string) {
  return value.replaceAll('_', ' ').toLowerCase();
}

export default async function AdminSecurityPage({ searchParams }: PageProps) {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/security');
  const filters = normalizeAdminSecurityFilters(await searchParams);
  const now = new Date();
  const staleSince = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const eventSince = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const where: Prisma.RequestRateLimitWhereInput = {
    ...(filters.action === 'ALL' ? {} : { action: filters.action }),
    ...(filters.state === 'ACTIVE_BLOCK' ? { blockedUntil: { gt: now } } : {}),
    ...(filters.state === 'EXPIRED_BLOCK' ? { blockedUntil: { lte: now, not: null } } : {}),
    ...(filters.state === 'OBSERVED' ? { blockedUntil: null } : {}),
  };
  const totalBuckets = await prisma.requestRateLimit.count({ where });
  const overLimit = totalBuckets > ADMIN_SECURITY_RESULT_LIMIT;
  const totalPages = Math.max(1, Math.ceil(totalBuckets / ADMIN_SECURITY_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const [
    userCount,
    mfaEnabledCount,
    adminCount,
    adminMfaCount,
    activeSessions,
    staleSessions,
    expiredSessions,
    activeBlocks,
    recentSecurityEvents,
    rateLimits,
    actionGroups,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.userMfaCredential.count({ where: { enabledAt: { not: null } } }),
    prisma.user.count({ where: { role: 'PLATFORM_ADMIN' } }),
    prisma.userMfaCredential.count({
      where: { enabledAt: { not: null }, user: { role: 'PLATFORM_ADMIN' } },
    }),
    prisma.userSession.count({ where: { expiresAt: { gt: now } } }),
    prisma.userSession.count({ where: { expiresAt: { gt: now }, lastSeenAt: { lt: staleSince } } }),
    prisma.userSession.count({ where: { expiresAt: { lte: now } } }),
    prisma.requestRateLimit.count({ where: { blockedUntil: { gt: now } } }),
    prisma.accountSecurityEvent.count({ where: { createdAt: { gte: eventSince } } }),
    overLimit
      ? Promise.resolve([])
      : prisma.requestRateLimit.findMany({
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * ADMIN_SECURITY_PAGE_SIZE,
          take: ADMIN_SECURITY_PAGE_SIZE,
          where,
        }),
    overLimit
      ? Promise.resolve([])
      : prisma.requestRateLimit.groupBy({
          by: ['action'],
          _count: { _all: true },
          orderBy: { action: 'asc' },
          where,
        }),
  ]);

  return (
    <section className="account-page business-report admin-workspace">
      <header className="admin-hero">
        <div>
          <p className="admin-hero__eyebrow">Protected access monitoring</p>
          <h1>Security operations posture</h1>
          <p>
            Review MFA adoption, session hygiene, security-event volume, and throttling activity
            without exposing account identifiers or authentication secrets.
          </p>
        </div>
        <div className="manage-booking__document-actions">
          <Link className="ui-button ui-button--secondary" href="/admin/audit?domain=SECURITY">
            Security audit history
          </Link>
          <Link className="ui-button ui-button--secondary" href="/admin">
            Operations console
          </Link>
        </div>
      </header>

      <div className="partner-bookings__summary">
        <Card>
          <span>Account MFA adoption</span>
          <strong>{securityCoverage(mfaEnabledCount, userCount)}%</strong>
          <small>
            {mfaEnabledCount} of {userCount} accounts
          </small>
        </Card>
        <Card>
          <span>Administrator MFA adoption</span>
          <strong>{securityCoverage(adminMfaCount, adminCount)}%</strong>
          <small>
            {adminMfaCount} of {adminCount} administrators
          </small>
        </Card>
        <Card>
          <span>Active browser sessions</span>
          <strong>{activeSessions}</strong>
          <small>{staleSessions} inactive for more than 30 days</small>
        </Card>
        <Card>
          <span>Expired session records</span>
          <strong>{expiredSessions}</strong>
          <small>Eligible for routine retention cleanup</small>
        </Card>
        <Card>
          <span>Active throttle blocks</span>
          <strong>{activeBlocks}</strong>
          <small>Identifiers remain irreversibly hashed</small>
        </Card>
        <Card>
          <span>Security events in 24 hours</span>
          <strong>{recentSecurityEvents}</strong>
          <small>Open the audit history for authorized detail</small>
        </Card>
      </div>

      <Card>
        <strong>Privacy-preserving operational evidence</strong>
        <p>
          Throttle records are displayed without their hashed key, IP address, email, account ID,
          session token, MFA secret, or recovery code. This page has no unblock or
          session-revocation action.
        </p>
      </Card>

      <form className="business-report__filters" method="get">
        <label className="ui-field">
          <span className="ui-field__label">Protected action</span>
          <select className="ui-input" defaultValue={filters.action} name="action">
            <option value="ALL">All actions</option>
            <option value="LOGIN">Login</option>
            <option value="REGISTER">Registration</option>
            <option value="PASSWORD_CHANGE">Password change</option>
            <option value="PASSWORD_RESET_REQUEST">Password reset request</option>
            <option value="PASSWORD_RESET_CONFIRM">Password reset confirmation</option>
            <option value="CUSTOMER_SUPPORT_CREATE">Customer support creation</option>
            <option value="ANALYTICS_EVENT">Analytics event</option>
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Throttle state</span>
          <select className="ui-input" defaultValue={filters.state} name="state">
            <option value="ALL">All states</option>
            <option value="ACTIVE_BLOCK">Active block</option>
            <option value="EXPIRED_BLOCK">Expired block</option>
            <option value="OBSERVED">Observed, not blocked</option>
          </select>
        </label>
        <div className="business-report__filter-actions">
          <button className="ui-button ui-button--primary" type="submit">
            Apply filters
          </button>
          <Link className="ui-button ui-button--secondary" href="/admin/security">
            Clear
          </Link>
        </div>
      </form>

      {overLimit ? (
        <Card className="admin-empty-state">
          This filter matches {totalBuckets.toLocaleString('en-IN')} throttle records. Narrow the
          action or state to no more than {ADMIN_SECURITY_RESULT_LIMIT.toLocaleString('en-IN')}.
        </Card>
      ) : (
        <>
          <div className="partner-bookings__summary">
            <Card>
              <span>Filtered throttle records</span>
              <strong>{totalBuckets}</strong>
            </Card>
            {actionGroups.map((group) => (
              <Card key={group.action}>
                <span>{label(group.action)}</span>
                <strong>{group._count._all}</strong>
              </Card>
            ))}
          </div>

          <Card className="business-report__table-card">
            <div className="business-report__table-scroll">
              <table className="business-report__table">
                <thead>
                  <tr>
                    <th>Protected action</th>
                    <th>State</th>
                    <th>Attempts in window</th>
                    <th>Window started</th>
                    <th>Block expiry</th>
                    <th>Last updated</th>
                  </tr>
                </thead>
                <tbody>
                  {rateLimits.map((record) => (
                    <tr key={record.id}>
                      <td>{label(record.action)}</td>
                      <td>
                        <span className="admin-status-badge">
                          {label(rateLimitPosture(record.blockedUntil, now))}
                        </span>
                      </td>
                      <td>{record.attempts}</td>
                      <td>{dateLabel(record.windowStartedAt)}</td>
                      <td>
                        {record.blockedUntil ? dateLabel(record.blockedUntil) : 'Not blocked'}
                      </td>
                      <td>{dateLabel(record.updatedAt)}</td>
                    </tr>
                  ))}
                  {rateLimits.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No throttle records match these filters.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>

          <nav aria-label="Security throttle pages" className="business-audit-pagination">
            {page > 1 ? (
              <Link
                className="ui-button ui-button--secondary"
                href={adminSecurityPath(filters, page - 1)}
              >
                Previous page
              </Link>
            ) : (
              <span />
            )}
            <span>
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                className="ui-button ui-button--secondary"
                href={adminSecurityPath(filters, page + 1)}
              >
                Next page
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </>
      )}
    </section>
  );
}
