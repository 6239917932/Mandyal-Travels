import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { CustomerSupportCenter } from '@/components/account/CustomerSupportCenter';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import { getCustomerSupportCenter } from '@/services/customerSupportCenterService';
import { normalizeCustomerSupportFilters } from '@/services/customerServicingIntentRules';
import { normalizeCustomerSupportPrefill } from '@/services/customerTripServicingService';

export const metadata: Metadata = { title: 'Customer support' };

type CustomerSupportPageProps = {
  searchParams: Promise<{
    bookingReference?: string | string[];
    category?: string | string[];
    message?: string | string[];
    page?: string | string[];
    q?: string | string[];
    status?: string | string[];
    subject?: string | string[];
  }>;
};

function pagePath({ page, query, status }: { page: number; query: string; status: string }) {
  const params = new URLSearchParams({ page: String(page) });
  if (query) params.set('q', query);
  if (status !== 'ALL') params.set('status', status);
  return `/account/support?${params.toString()}`;
}

export default async function CustomerSupportPage({ searchParams }: CustomerSupportPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/account/support');

  const values = await searchParams;
  const filters = normalizeCustomerSupportFilters(values);
  const initialRequest = normalizeCustomerSupportPrefill(values);
  const result = await getCustomerSupportCenter({ ...filters, userId: user.id });

  return (
    <section className="account-page">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Help and servicing</p>
          <h1>Customer support</h1>
          <p>Create a human-reviewed request and follow customer-visible updates.</p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/account">
          Back to my account
        </Link>
      </div>

      <div className="partner-bookings__summary">
        <Card>
          <span>Open cases</span>
          <strong>{result.openCases}</strong>
        </Card>
        <Card>
          <span>Closed cases</span>
          <strong>{result.closedCases}</strong>
        </Card>
        <Card>
          <span>Matching cases</span>
          <strong>{result.totalCases}</strong>
        </Card>
      </div>

      <form className="business-report__filters" method="get" role="search">
        <div className="ui-field business-report__search">
          <label className="ui-field__label" htmlFor="customer-support-query">
            Search your case number, booking reference, or subject
          </label>
          <input
            className="ui-input"
            defaultValue={result.query}
            id="customer-support-query"
            maxLength={80}
            name="q"
          />
        </div>
        <div className="ui-field">
          <label className="ui-field__label" htmlFor="customer-support-status">
            Status
          </label>
          <select
            className="ui-input"
            defaultValue={result.status}
            id="customer-support-status"
            name="status"
          >
            <option value="ALL">All cases</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <button className="ui-button ui-button--primary" type="submit">
          Apply filters
        </button>
        <Link className="ui-button ui-button--secondary" href="/account/support">
          Clear filters
        </Link>
      </form>

      <CustomerSupportCenter
        cases={result.cases.map((supportCase) => ({
          ...supportCase,
          createdAt: supportCase.createdAt.toISOString(),
          updatedAt: supportCase.updatedAt.toISOString(),
        }))}
        initialRequest={initialRequest}
      />

      {result.totalPages > 1 ? (
        <nav aria-label="Customer support case pages" className="business-audit-pagination">
          {result.page > 1 ? (
            <Link
              className="ui-button ui-button--secondary"
              href={pagePath({
                page: result.page - 1,
                query: result.query,
                status: result.status,
              })}
            >
              Previous page
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {result.page} of {result.totalPages}
          </span>
          {result.page < result.totalPages ? (
            <Link
              className="ui-button ui-button--secondary"
              href={pagePath({
                page: result.page + 1,
                query: result.query,
                status: result.status,
              })}
            >
              Next page
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
      {result.totalCases === 500 ? (
        <p className="booking-confirmation__fine-print" role="status">
          Showing the first 500 matching cases. Refine the search to narrow this view.
        </p>
      ) : null}
    </section>
  );
}
