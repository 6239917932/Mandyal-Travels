import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'User directory' };

const PAGE_SIZE = 25;

type AdminUsersPageProps = {
  searchParams: Promise<{ page?: string | string[]; q?: string | string[] }>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function readPage(value: string | string[] | undefined) {
  const parsed = Number(firstValue(value));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function pagePath(page: number, query: string) {
  const params = new URLSearchParams({ page: String(page) });
  if (query) params.set('q', query);
  return `/admin/users?${params.toString()}`;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    value,
  );
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const administrator = await getPlatformAdmin();
  if (!administrator) redirect('/login?returnTo=/admin/users');

  const values = await searchParams;
  const query = (firstValue(values.q) ?? '').trim().slice(0, 100);
  const where = query
    ? {
        OR: [
          { email: { contains: query } },
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          {
            organizationMemberships: {
              some: { organization: { name: { contains: query } } },
            },
          },
        ],
      }
    : {};
  const totalUsers = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
  const page = Math.min(readPage(values.page), totalPages);
  const users = await prisma.user.findMany({
    include: {
      _count: { select: { customerSupportCases: true, trips: true } },
      organizationMemberships: {
        select: { organization: { select: { id: true, name: true } }, role: true },
        take: 1,
      },
      sessions: {
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, expiresAt: true },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    where,
  });
  const now = new Date();

  return (
    <section className="account-page business-report">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Mandyal operations</p>
          <h1>User directory</h1>
          <p>Find customer, business, partner, and platform accounts for account servicing.</p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/admin">
          Back to operations console
        </Link>
      </div>

      <form className="business-report__filters" method="get">
        <div className="ui-field business-report__search">
          <label className="ui-field__label" htmlFor="admin-user-search">
            Name or email
          </label>
          <input
            className="ui-input"
            defaultValue={query}
            id="admin-user-search"
            maxLength={100}
            name="q"
            placeholder="Search users"
            type="search"
          />
        </div>
        <div className="business-report__filter-actions">
          <button className="ui-button ui-button--primary" type="submit">
            Search
          </button>
          {query ? (
            <Link className="ui-button ui-button--secondary" href="/admin/users">
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      <Card className="business-report__table-card">
        <div className="business-report__table-scroll">
          <table className="business-report__table">
            <thead>
              <tr>
                <th>User</th>
                <th>Account role</th>
                <th>Organization</th>
                <th>Travel and support</th>
                <th>Latest session</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const membership = user.organizationMemberships[0];
                const latestSession = user.sessions[0];
                const sessionActive = latestSession?.expiresAt.getTime() > now.getTime();
                return (
                  <tr key={user.id}>
                    <td>
                      <Link className="admin-directory-link" href={`/admin/users/${user.id}`}>
                        {user.firstName} {user.lastName}
                      </Link>
                      <span>{user.email}</span>
                    </td>
                    <td>
                      <strong>{user.role.replaceAll('_', ' ')}</strong>
                      <span>{user.emailVerifiedAt ? 'Email verified' : 'Email not verified'}</span>
                    </td>
                    <td>
                      {membership ? (
                        <Link
                          className="admin-directory-link"
                          href={`/admin/organizations/${membership.organization.id}`}
                        >
                          {membership.organization.name}
                        </Link>
                      ) : (
                        <strong>Personal account</strong>
                      )}
                      <span>{membership ? membership.role : 'No company membership'}</span>
                    </td>
                    <td>
                      <strong>{user._count.trips} transport records</strong>
                      <span>{user._count.customerSupportCases} support cases</span>
                    </td>
                    <td>
                      <strong>{sessionActive ? 'Active' : 'No active latest session'}</strong>
                      <span>
                        {latestSession ? formatDate(latestSession.createdAt) : 'Never signed in'}
                      </span>
                    </td>
                    <td>
                      <time dateTime={user.createdAt.toISOString()}>
                        {formatDate(user.createdAt)}
                      </time>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6}>No users match this search.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <nav aria-label="User directory pages" className="business-audit-pagination">
        {page > 1 ? (
          <Link className="ui-button ui-button--secondary" href={pagePath(page - 1, query)}>
            Previous page
          </Link>
        ) : (
          <span />
        )}
        <span>
          {totalUsers.toLocaleString('en-IN')} users · Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Link className="ui-button ui-button--secondary" href={pagePath(page + 1, query)}>
            Next page
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </section>
  );
}
