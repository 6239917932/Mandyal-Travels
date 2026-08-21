import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Organization directory' };

const PAGE_SIZE = 25;

type AdminOrganizationsPageProps = {
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
  return `/admin/organizations?${params.toString()}`;
}

function formatCurrency(amount: number | null) {
  if (amount === null) return 'No limit';
  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    value,
  );
}

export default async function AdminOrganizationsPage({
  searchParams,
}: AdminOrganizationsPageProps) {
  const administrator = await getPlatformAdmin();
  if (!administrator) redirect('/login?returnTo=/admin/organizations');

  const values = await searchParams;
  const query = (firstValue(values.q) ?? '').trim().slice(0, 100);
  const where = query
    ? {
        OR: [
          { name: { contains: query } },
          { legalName: { contains: query } },
          { contactEmail: { contains: query } },
          { taxRegistrationId: { contains: query } },
        ],
      }
    : {};
  const totalOrganizations = await prisma.organization.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalOrganizations / PAGE_SIZE));
  const page = Math.min(readPage(values.page), totalPages);
  const organizations = await prisma.organization.findMany({
    include: {
      _count: {
        select: { invitations: true, members: true, supportCases: true, travelRequests: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    where,
  });

  return (
    <section className="account-page business-report admin-workspace">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Mandyal operations</p>
          <h1>Organization directory</h1>
          <p>Review company accounts, membership, policy settings, and servicing activity.</p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/admin">
          Back to operations console
        </Link>
      </div>

      <form className="business-report__filters" method="get">
        <div className="ui-field business-report__search">
          <label className="ui-field__label" htmlFor="admin-organization-search">
            Organization, contact, or tax registration
          </label>
          <input
            className="ui-input"
            defaultValue={query}
            id="admin-organization-search"
            maxLength={100}
            name="q"
            placeholder="Search organizations"
            type="search"
          />
        </div>
        <div className="business-report__filter-actions">
          <button className="ui-button ui-button--primary" type="submit">
            Search
          </button>
          {query ? (
            <Link className="ui-button ui-button--secondary" href="/admin/organizations">
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
                <th>Organization</th>
                <th>Contact</th>
                <th>Access</th>
                <th>Travel activity</th>
                <th>Policy</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((organization) => (
                <tr key={organization.id}>
                  <td>
                    <Link
                      className="admin-directory-link"
                      href={`/admin/organizations/${organization.id}`}
                    >
                      {organization.name}
                    </Link>
                    <span>{organization.legalName ?? organization.type}</span>
                    {organization.taxRegistrationId ? (
                      <span>Tax ID: {organization.taxRegistrationId}</span>
                    ) : null}
                  </td>
                  <td>
                    <strong>{organization.contactEmail ?? 'No email recorded'}</strong>
                    <span>{organization.contactPhone ?? 'No phone recorded'}</span>
                  </td>
                  <td>
                    <strong>{organization._count.members} team members</strong>
                    <span>{organization._count.invitations} invitations</span>
                  </td>
                  <td>
                    <strong>{organization._count.travelRequests} company requests</strong>
                    <span>{organization._count.supportCases} support cases</span>
                  </td>
                  <td>
                    <strong>
                      {organization.approvalRequired ? 'Approval required' : 'Auto-approved'}
                    </strong>
                    <span>Cabin: {organization.defaultCabinClass}</span>
                    <span>Limit: {formatCurrency(organization.maximumTripAmount)}</span>
                  </td>
                  <td>
                    <time dateTime={organization.createdAt.toISOString()}>
                      {formatDate(organization.createdAt)}
                    </time>
                  </td>
                </tr>
              ))}
              {organizations.length === 0 ? (
                <tr>
                  <td colSpan={6}>No organizations match this search.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <nav aria-label="Organization directory pages" className="business-audit-pagination">
        {page > 1 ? (
          <Link className="ui-button ui-button--secondary" href={pagePath(page - 1, query)}>
            Previous page
          </Link>
        ) : (
          <span />
        )}
        <span>
          {totalOrganizations.toLocaleString('en-IN')} organizations · Page {page} of {totalPages}
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
