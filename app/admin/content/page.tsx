import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { DestinationContentEditor } from '@/components/admin/DestinationContentEditor';
import { Card } from '@/components/ui/Card';
import type { Prisma } from '@/generated/prisma/client';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { parseDestinationContentList } from '@/services/destinationContentService';

export const metadata: Metadata = { title: 'Destination content' };
const PAGE_SIZE = 25;

type Props = {
  searchParams: Promise<{
    page?: string | string[];
    q?: string | string[];
    status?: string | string[];
  }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    value,
  );
}

function contentPath(query: string, status: string, page: number) {
  const values = new URLSearchParams({ page: String(Math.max(1, page)) });
  if (query) values.set('q', query);
  if (status !== 'ALL') values.set('status', status);
  return `/admin/content?${values.toString()}`;
}

export default async function AdminContentPage({ searchParams }: Props) {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/content');
  const values = await searchParams;
  const query = (first(values.q) ?? '').trim().slice(0, 100);
  const requestedStatus = (first(values.status) ?? 'ALL').toUpperCase();
  const status = ['ALL', 'DRAFT', 'PUBLISHED'].includes(requestedStatus) ? requestedStatus : 'ALL';
  const requestedPage = Number(first(values.page));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const where: Prisma.DestinationContentWhereInput = {
    ...(status === 'ALL' ? {} : { status }),
    ...(query
      ? {
          OR: [
            { name: { contains: query } },
            { slug: { contains: query } },
            { state: { contains: query } },
          ],
        }
      : {}),
  };
  const count = await prisma.destinationContent.count({ where });
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const [destinations, events] = await Promise.all([
    prisma.destinationContent.findMany({
      include: { updatedBy: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: { updatedAt: 'desc' },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      where,
    }),
    prisma.destinationContentEvent.findMany({
      include: {
        actor: { select: { firstName: true, lastName: true } },
        destination: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ]);

  return (
    <section className="account-page admin-workspace">
      <header className="admin-hero">
        <div>
          <p className="admin-hero__eyebrow">Governed editorial workflow</p>
          <h1>Destination content</h1>
          <p>
            Create reviewed travel guides with explicit drafts, human publication controls,
            optimistic versions, and append-only change history.
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/admin">
          Back to operations
        </Link>
      </header>

      <Card>
        <h2>Create destination draft</h2>
        <p>
          Drafts are private. Publication requires a complete introduction, image, timing,
          highlights, travel tips, and a recorded reason.
        </p>
        <DestinationContentEditor />
      </Card>

      <form className="business-report__filters" method="get">
        <label className="ui-field business-report__search">
          <span className="ui-field__label">Destination, slug, or state</span>
          <input className="ui-input" defaultValue={query} maxLength={100} name="q" type="search" />
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Publication status</span>
          <select className="ui-input" defaultValue={status} name="status">
            <option value="ALL">All entries</option>
            <option value="DRAFT">Drafts</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </label>
        <div className="business-report__filter-actions">
          <button className="ui-button ui-button--primary" type="submit">
            Apply filters
          </button>
          <Link className="ui-button ui-button--secondary" href="/admin/content">
            Clear
          </Link>
        </div>
      </form>

      <div className="partner-bookings__summary">
        <Card>
          <span>Filtered entries</span>
          <strong>{count.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Published on this page</span>
          <strong>{destinations.filter((item) => item.status === 'PUBLISHED').length}</strong>
        </Card>
        <Card>
          <span>Drafts on this page</span>
          <strong>{destinations.filter((item) => item.status === 'DRAFT').length}</strong>
        </Card>
      </div>

      <div className="account-trips__list">
        {destinations.map((destination) => (
          <Card className="account-trip" key={destination.id}>
            <div className="account-trip__topline">
              <span className="account-trip__type">{destination.state}</span>
              <strong>
                {destination.status} · v{destination.version}
              </strong>
            </div>
            <div className="account-trip__body">
              <div>
                <h2>{destination.name}</h2>
                <p>{destination.summary}</p>
                <small>
                  Updated by {destination.updatedBy.firstName} {destination.updatedBy.lastName} (
                  {destination.updatedBy.email}) · {formatDate(destination.updatedAt)}
                </small>
              </div>
            </div>
            {destination.status === 'PUBLISHED' ? (
              <Link className="home-card__link" href={`/destinations/${destination.slug}`}>
                Open public guide
              </Link>
            ) : null}
            <details>
              <summary>Edit and review version {destination.version}</summary>
              <DestinationContentEditor
                value={{
                  bestTimeToVisit: destination.bestTimeToVisit,
                  country: destination.country,
                  heroImageUrl: destination.heroImageUrl,
                  highlights: parseDestinationContentList(destination.highlightsJson),
                  id: destination.id,
                  introduction: destination.introduction,
                  name: destination.name,
                  slug: destination.slug,
                  state: destination.state,
                  status: destination.status,
                  summary: destination.summary,
                  travelTips: parseDestinationContentList(destination.travelTipsJson),
                  version: destination.version,
                }}
              />
            </details>
          </Card>
        ))}
        {destinations.length === 0 ? (
          <Card>No destination content matches these filters.</Card>
        ) : null}
      </div>

      <nav aria-label="Destination content pages" className="business-audit-pagination">
        {currentPage > 1 ? (
          <Link
            className="ui-button ui-button--secondary"
            href={contentPath(query, status, currentPage - 1)}
          >
            Previous page
          </Link>
        ) : (
          <span />
        )}
        <span>
          Page {currentPage} of {totalPages}
        </span>
        {currentPage < totalPages ? (
          <Link
            className="ui-button ui-button--secondary"
            href={contentPath(query, status, currentPage + 1)}
          >
            Next page
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <Card className="business-report__table-card">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Append-only history</p>
          <h2>Recent editorial changes</h2>
        </div>
        <div className="business-report__table-scroll">
          <table className="business-report__table">
            <thead>
              <tr>
                <th>Destination</th>
                <th>Action</th>
                <th>State</th>
                <th>Reason</th>
                <th>Administrator</th>
                <th>Changed</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{event.destination.name}</td>
                  <td>{event.action.replaceAll('_', ' ')}</td>
                  <td>
                    {event.status} · v{event.version}
                  </td>
                  <td>{event.reason}</td>
                  <td>
                    {event.actor.firstName} {event.actor.lastName}
                  </td>
                  <td>{formatDate(event.createdAt)}</td>
                </tr>
              ))}
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6}>No editorial changes have been recorded.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
