import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Supplier application history' };

export default async function AdminPartnerApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/partner-applications');
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 120) : '';
  const status =
    typeof params.status === 'string' && ['PENDING', 'APPROVED', 'REJECTED'].includes(params.status)
      ? params.status
      : '';
  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: ['businessName', 'contactEmail', 'contactName'].map((field) => ({
            [field]: { contains: q },
          })),
        }
      : {}),
  };
  const total = await prisma.partnerApplication.count({ where });
  const pages = Math.max(1, Math.ceil(total / 30));
  const requestedPage =
    typeof params.page === 'string' && /^\d{1,6}$/.test(params.page) ? Number(params.page) : 1;
  const page = Math.max(1, Math.min(requestedPage, pages));
  const applications = await prisma.partnerApplication.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 30,
    skip: (page - 1) * 30,
  });
  const pageHref = (next: number) =>
    `/admin/partner-applications?${new URLSearchParams({ q, status, page: String(next) })}`;
  return (
    <section className="account-page business-report admin-workspace">
      <header className="admin-hero">
        <div>
          <p className="hotel-page__eyebrow">Supplier governance</p>
          <h1>Supplier application history</h1>
          <p>Pending, approved and rejected applications remain available for review.</p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/admin/partners">
          Supplier control centre
        </Link>
      </header>
      <Card>
        <form className="business-report__filters" method="get">
          <label className="ui-field">
            <span className="ui-field__label">Search applications</span>
            <input
              className="ui-input"
              defaultValue={q}
              maxLength={120}
              name="q"
              placeholder="Business, contact name or email"
            />
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Status</span>
            <select className="ui-input" defaultValue={status} name="status">
              <option value="">All statuses</option>
              {['PENDING', 'APPROVED', 'REJECTED'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <div className="business-report__filter-actions">
            <button className="ui-button ui-button--primary" type="submit">
              Filter applications
            </button>
            <Link href="/admin/partner-applications">Clear filters</Link>
          </div>
        </form>
      </Card>
      <Card className="business-report__table-card">
        <div className="business-report__table-scroll">
          <table className="business-report__table">
            <thead>
              <tr>
                <th>Submitted</th>
                <th>Business</th>
                <th>Type</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((item) => (
                <tr key={item.id}>
                  <td>{item.createdAt.toLocaleString('en-IN')}</td>
                  <td>
                    <Link href={`/admin/partner-applications/${item.id}`}>{item.businessName}</Link>
                  </td>
                  <td>{item.partnerType}</td>
                  <td>{item.contactEmail}</td>
                  <td>{item.status}</td>
                  <td>
                    <Link href={`/admin/partner-applications/${item.id}`}>Open application</Link>
                  </td>
                </tr>
              ))}
              {!applications.length ? (
                <tr>
                  <td colSpan={6}>No applications match these filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
      <p>
        {total} applications · Page {page} of {pages}
      </p>
      <nav aria-label="Application pages">
        {page > 1 ? (
          <Link className="ui-button ui-button--secondary" href={pageHref(page - 1)}>
            Previous page
          </Link>
        ) : null}
        {page < pages ? (
          <Link className="ui-button ui-button--secondary" href={pageHref(page + 1)}>
            Next page
          </Link>
        ) : null}
      </nav>
    </section>
  );
}
