import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';
import {
  ADMIN_SETTLEMENT_PAGE_SIZE,
  ADMIN_SETTLEMENT_STATUSES,
  privateSettlementReference,
} from '@/services/adminSettlementWorkbenchService';
import { maskedPayoutDestination } from '@/services/partnerPayoutRules';
import { isPlatformFeatureEnabled } from '@/services/platformFeatureFlagService';

export const metadata: Metadata = { title: 'Settlement statements' };
type SearchValue = string | string[] | undefined;
type Props = { searchParams: Promise<{ page?: SearchValue; status?: SearchValue }> };

function first(value: SearchValue) {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}
function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { currency, style: 'currency' }).format(amount);
}
function partnerSettlementPath(status: string, page: number) {
  const params = new URLSearchParams({ page: String(Math.max(1, page)) });
  if (status !== 'ALL') params.set('status', status);
  return `/partner/settlements?${params.toString()}`;
}

export default async function PartnerSettlementsPage({ searchParams }: Props) {
  const access = await getPartnerAccess();
  if (!access?.partnerId) redirect('/partners');
  const query = await searchParams;
  const statusCandidate = first(query.status).trim().toUpperCase();
  const status = ADMIN_SETTLEMENT_STATUSES.includes(
    statusCandidate as (typeof ADMIN_SETTLEMENT_STATUSES)[number],
  )
    ? statusCandidate
    : 'ALL';
  const parsedPage = Number.parseInt(first(query.page), 10);
  const requestedPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const where = {
    partnerId: access.partnerId,
    ...(status === 'ALL' ? {} : { status }),
  };
  const [matchingCount, payoutAccounts, payoutOnboardingEnabled] = await Promise.all([
    prisma.partnerSettlement.count({ where }),
    prisma.partnerPayoutAccount.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        accountLast4: true,
        bankName: true,
        createdAt: true,
        id: true,
        isDefault: true,
        routingCodeMasked: true,
        status: true,
        verifiedAt: true,
      },
      take: 10,
      where: { partnerId: access.partnerId },
    }),
    isPlatformFeatureEnabled('PARTNER_PAYOUT_ONBOARDING'),
  ]);
  const pageCount = Math.max(1, Math.ceil(matchingCount / ADMIN_SETTLEMENT_PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const settlements = await prisma.partnerSettlement.findMany({
    orderBy: [{ periodEnd: 'desc' }, { id: 'desc' }],
    skip: (page - 1) * ADMIN_SETTLEMENT_PAGE_SIZE,
    take: ADMIN_SETTLEMENT_PAGE_SIZE,
    where,
  });
  return (
    <section className="account-page">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Supplier finance</p>
          <h1>Settlement statements</h1>
          <p>
            Review bounded period totals, platform commission, net payable amounts, approval, and
            payment status.
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/partner">
          Partner workspace
        </Link>
      </div>
      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Payout destination</p>
          <h2>Where approved settlements will be paid</h2>
          <p>
            Mandyal Travels stores only masked destination details and the payout provider’s token.
            Never send bank account numbers, UPI credentials, PINs, or OTPs through this portal.
          </p>
        </div>
        <div className="supplier-admin__grid">
          {payoutAccounts.map((account) => {
            const masked = maskedPayoutDestination(account);
            return (
              <Card key={account.id}>
                <span className="admin-status-badge">{account.status.replaceAll('_', ' ')}</span>
                <h3>{masked.bankName}</h3>
                <p>
                  Account {masked.account}
                  {masked.routingCodeMasked ? (
                    <>
                      <br />
                      Routing {masked.routingCodeMasked}
                    </>
                  ) : null}
                </p>
                <small>
                  {account.isDefault
                    ? 'Current verified payout destination'
                    : account.status === 'REJECTED'
                      ? 'This destination was not approved. Contact Mandyal Travels support.'
                      : 'Awaiting provider and administrator verification'}
                </small>
              </Card>
            );
          })}
          {payoutAccounts.length === 0 ? (
            <Card>
              <span className="admin-status-badge">
                {payoutOnboardingEnabled ? 'Provider setup required' : 'Not yet available'}
              </span>
              <h3>No payout destination linked</h3>
              <p>
                {payoutOnboardingEnabled
                  ? 'Complete the approved provider-hosted verification flow when Mandyal Travels sends it to your authorized account contact.'
                  : 'Payout linking will open only after the marketplace and payout provider are approved.'}
              </p>
            </Card>
          ) : null}
        </div>
      </div>
      <form className="business-report__filters" method="get">
        <label className="ui-field">
          <span className="ui-field__label">Statement state</span>
          <select className="ui-input" defaultValue={status} name="status">
            {ADMIN_SETTLEMENT_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item === 'ALL' ? 'All states' : item}
              </option>
            ))}
          </select>
        </label>
        <div className="business-report__filter-actions">
          <button className="ui-button ui-button--primary" type="submit">
            Apply filter
          </button>
          <Link className="ui-button ui-button--secondary" href="/partner/settlements">
            Clear
          </Link>
        </div>
      </form>
      <div className="supplier-admin__grid">
        {settlements.map((settlement) => (
          <Card key={settlement.id}>
            <span className="admin-status-badge">{settlement.status}</span>
            <h2>
              {settlement.periodStart} – {settlement.periodEnd}
            </h2>
            <p>
              {settlement.bookingCount} bookings
              <br />
              Gross: {money(settlement.grossAmount, settlement.currency)}
              <br />
              Commission: {money(settlement.commissionAmount, settlement.currency)}
              <br />
              <strong>Net: {money(settlement.netAmount, settlement.currency)}</strong>
            </p>
            {settlement.paymentReference ? (
              <small>
                Payment reference: {privateSettlementReference(settlement.paymentReference)}
              </small>
            ) : null}
          </Card>
        ))}
        {settlements.length === 0 ? (
          <Card>No matching settlement statements have been issued.</Card>
        ) : null}
      </div>
      <nav aria-label="Settlement statement pages" className="business-audit-pagination">
        {page > 1 ? (
          <Link
            className="ui-button ui-button--secondary"
            href={partnerSettlementPath(status, page - 1)}
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
            href={partnerSettlementPath(status, page + 1)}
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
