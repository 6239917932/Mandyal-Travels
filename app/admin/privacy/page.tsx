import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminPrivacyRequestAction } from '@/components/admin/AdminPrivacyRequestAction';
import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { PRIVACY_REQUEST_STATUSES, PRIVACY_REQUEST_TYPES } from '@/lib/privacy/governance';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Privacy operations' };

const PAGE_SIZE = 25;
type SearchValue = string | string[] | undefined;
type Props = {
  searchParams: Promise<{
    page?: SearchValue;
    q?: SearchValue;
    status?: SearchValue;
    type?: SearchValue;
  }>;
};
const first = (value: SearchValue) => (Array.isArray(value) ? value[0] : value);

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    value,
  );
}

export default async function AdminPrivacyPage({ searchParams }: Props) {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/privacy');
  const values = await searchParams;
  const query = (first(values.q) ?? '').trim().slice(0, 100);
  const candidateStatus = (first(values.status) ?? 'OPEN').toUpperCase();
  const candidateType = (first(values.type) ?? 'ALL').toUpperCase();
  const status =
    candidateStatus === 'ALL' || PRIVACY_REQUEST_STATUSES.some((item) => item === candidateStatus)
      ? candidateStatus
      : 'OPEN';
  const type =
    candidateType === 'ALL' || PRIVACY_REQUEST_TYPES.some((item) => item === candidateType)
      ? candidateType
      : 'ALL';
  const parsedPage = Number(first(values.page));
  const requestedPage = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const where = {
    ...(status === 'ALL' ? {} : { status }),
    ...(type === 'ALL' ? {} : { requestType: type }),
    ...(query
      ? {
          OR: [
            { id: { contains: query } },
            { user: { is: { email: { contains: query } } } },
            { user: { is: { firstName: { contains: query } } } },
            { user: { is: { lastName: { contains: query } } } },
          ],
        }
      : {}),
  };
  const count = await prisma.dataPrivacyRequest.count({ where });
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const requests = await prisma.dataPrivacyRequest.findMany({
    include: {
      events: {
        include: { actor: { select: { email: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
      reviewedBy: { select: { email: true, firstName: true, lastName: true } },
      user: { select: { email: true, firstName: true, id: true, lastName: true } },
    },
    orderBy: [{ dueAt: 'asc' }, { requestedAt: 'asc' }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    where,
  });
  const path = (nextPage: number) => {
    const params = new URLSearchParams({ page: String(Math.max(1, nextPage)) });
    if (query) params.set('q', query);
    if (status !== 'OPEN') params.set('status', status);
    if (type !== 'ALL') params.set('type', type);
    return `/admin/privacy?${params.toString()}`;
  };
  const now = new Date();

  return (
    <section className="account-page business-report admin-workspace">
      <header className="admin-hero">
        <div>
          <p className="admin-hero__eyebrow">Governed human privacy review</p>
          <h1>Privacy operations</h1>
          <p>
            Review access, correction, deletion, and restriction requests without automatically
            deleting protected booking, finance, dispute, or statutory records.
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/admin">
          Back to operations
        </Link>
      </header>

      <form className="business-report__filters" method="get">
        <label className="ui-field business-report__search">
          <span className="ui-field__label">Request or customer</span>
          <input className="ui-input" defaultValue={query} maxLength={100} name="q" type="search" />
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Status</span>
          <select className="ui-input" defaultValue={status} name="status">
            <option value="ALL">All statuses</option>
            {PRIVACY_REQUEST_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Type</span>
          <select className="ui-input" defaultValue={type} name="type">
            <option value="ALL">All request types</option>
            {PRIVACY_REQUEST_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <div className="business-report__filter-actions">
          <button className="ui-button ui-button--primary" type="submit">
            Apply filters
          </button>
          <Link className="ui-button ui-button--secondary" href="/admin/privacy">
            Clear
          </Link>
        </div>
      </form>

      <div className="partner-bookings__summary">
        <Card>
          <span>Matching requests</span>
          <strong>{count.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Queue posture</span>
          <strong>Human review only</strong>
        </Card>
        <Card>
          <span>Target</span>
          <strong>Within 30 days</strong>
        </Card>
      </div>

      <div className="account-trips__list">
        {requests.map((item) => {
          const overdue = item.dueAt < now && !['COMPLETED', 'REJECTED'].includes(item.status);
          return (
            <Card key={item.id} className="ui-card--padded">
              <div className="account-trip__topline">
                <strong>
                  {item.requestType} · {item.status.replaceAll('_', ' ')}
                </strong>
                <span>
                  {overdue ? 'OVERDUE · ' : ''}Due {formatDate(item.dueAt)}
                </span>
              </div>
              <p>
                <Link href={`/admin/users/${item.user.id}`}>
                  {item.user.firstName} {item.user.lastName}
                </Link>{' '}
                · {item.user.email}
              </p>
              <p>
                Requested {formatDate(item.requestedAt)} · Version {item.version}
              </p>
              {item.resolutionNote ? (
                <p>
                  <strong>Latest review note:</strong> {item.resolutionNote}
                </p>
              ) : null}
              {item.reviewedBy ? (
                <p>
                  Last reviewed by {item.reviewedBy.firstName} {item.reviewedBy.lastName} ·{' '}
                  {item.reviewedBy.email}
                </p>
              ) : null}
              {item.events.length ? (
                <details>
                  <summary>Recent immutable review history</summary>
                  <ol>
                    {item.events.map((event) => (
                      <li key={event.id}>
                        <strong>
                          {event.fromStatus} → {event.toStatus}
                        </strong>{' '}
                        · {event.note} · {event.actor.email} · {formatDate(event.createdAt)}
                      </li>
                    ))}
                  </ol>
                </details>
              ) : null}
              <AdminPrivacyRequestAction
                requestId={item.id}
                status={item.status}
                version={item.version}
              />
            </Card>
          );
        })}
        {requests.length === 0 ? (
          <Card className="ui-card--padded">
            <strong>No privacy requests match these filters.</strong>
          </Card>
        ) : null}
      </div>

      <nav aria-label="Privacy request pages" className="business-audit-pagination">
        {page > 1 ? (
          <Link className="ui-button ui-button--secondary" href={path(page - 1)}>
            Previous page
          </Link>
        ) : (
          <span />
        )}
        <span>
          Page {page} of {pageCount}
        </span>
        {page < pageCount ? (
          <Link className="ui-button ui-button--secondary" href={path(page + 1)}>
            Next page
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </section>
  );
}
