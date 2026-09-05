import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Prisma } from '@/generated/prisma/client';

import {
  AdminPaymentActions,
  AdminPayoutAccountActions,
  AdminPayoutAccountImport,
  AdminRefundActions,
} from '@/components/admin/AdminFinanceActions';
import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import {
  ADMIN_FINANCE_PAGE_SIZE,
  ADMIN_FINANCE_RESULT_LIMIT,
  ADMIN_FINANCE_WINDOWS,
  ADMIN_PAYMENT_STATUSES,
  ADMIN_RECONCILIATION_STATUSES,
  ADMIN_REFUND_STATUSES,
  adminFinancePath,
  canOperateOnPayment,
  financeWindowStart,
  normalizeAdminFinanceFilters,
  privateProviderReference,
  redactFinanceNarrative,
  refundReviewPosture,
} from '@/services/adminFinanceWorkbenchService';
import { maskedPayoutDestination } from '@/services/partnerPayoutRules';
import { isPlatformFeatureEnabled } from '@/services/platformFeatureFlagService';

export const metadata: Metadata = { title: 'Finance operations' };

function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { currency, style: 'currency' }).format(amount);
}

function date(value: Date) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    value,
  );
}

type SearchValue = string | string[] | undefined;
type Props = {
  searchParams: Promise<{
    paymentPage?: SearchValue;
    paymentStatus?: SearchValue;
    q?: SearchValue;
    reconciliation?: SearchValue;
    refundPage?: SearchValue;
    refundStatus?: SearchValue;
    window?: SearchValue;
  }>;
};

export default async function AdminFinancePage({ searchParams }: Props) {
  const administrator = await getPlatformAdmin();
  if (!administrator) redirect('/login?returnTo=/admin/finance');

  const filters = normalizeAdminFinanceFilters(await searchParams);
  const start = financeWindowStart(filters.window, new Date());
  const paymentWhere: Prisma.PaymentTransactionWhereInput = {
    ...(filters.paymentStatus === 'ALL' ? {} : { status: filters.paymentStatus }),
    ...(filters.reconciliation === 'ALL' ? {} : { reconciliationStatus: filters.reconciliation }),
    ...(start ? { createdAt: { gte: start } } : {}),
    ...(filters.query
      ? {
          OR: [
            { id: { contains: filters.query } },
            { provider: { contains: filters.query } },
            { providerRef: { contains: filters.query } },
            { booking: { is: { confirmationCode: { contains: filters.query } } } },
            { booking: { is: { hotelSlug: { contains: filters.query } } } },
          ],
        }
      : {}),
  };
  const refundWhere: Prisma.RefundRequestWhereInput = {
    ...(filters.refundStatus === 'ALL' ? {} : { status: filters.refundStatus }),
    ...(start ? { createdAt: { gte: start } } : {}),
    ...(filters.query
      ? {
          OR: [
            { id: { contains: filters.query } },
            { payment: { is: { providerRef: { contains: filters.query } } } },
            { booking: { is: { confirmationCode: { contains: filters.query } } } },
          ],
        }
      : {}),
  };

  const [
    paymentCount,
    refundCount,
    captured,
    refunded,
    discrepancies,
    pendingRefunds,
    ledger,
    journals,
    payoutBatches,
    payoutAccounts,
    payoutOnboardingEnabled,
    payoutPartners,
    supplierPayable,
  ] = await Promise.all([
    prisma.paymentTransaction.count({ where: paymentWhere }),
    prisma.refundRequest.count({ where: refundWhere }),
    prisma.paymentTransaction.aggregate({ _sum: { amount: true }, where: { status: 'captured' } }),
    prisma.refundRequest.aggregate({ _sum: { amount: true }, where: { status: 'APPROVED' } }),
    prisma.paymentTransaction.count({ where: { reconciliationStatus: 'DISCREPANCY' } }),
    prisma.refundRequest.count({ where: { status: 'PENDING' } }),
    prisma.financialLedgerEntry.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.financialJournal.findMany({
      include: { postings: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.partnerPayoutBatch.findMany({
      include: {
        instructions: {
          include: { partner: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.partnerPayoutAccount.findMany({
      include: {
        events: { orderBy: { createdAt: 'desc' }, take: 5 },
        partner: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    isPlatformFeatureEnabled('PARTNER_PAYOUT_ONBOARDING'),
    prisma.supplyPartner.findMany({
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true },
      take: 100,
      where: { status: 'ACTIVE' },
    }),
    prisma.paymentAllocation.aggregate({
      _sum: { amount: true },
      where: { allocationType: 'SUPPLIER_PAYABLE' },
    }),
  ]);
  const paymentBoundedCount = Math.min(paymentCount, ADMIN_FINANCE_RESULT_LIMIT);
  const refundBoundedCount = Math.min(refundCount, ADMIN_FINANCE_RESULT_LIMIT);
  const paymentPageCount = Math.max(1, Math.ceil(paymentBoundedCount / ADMIN_FINANCE_PAGE_SIZE));
  const refundPageCount = Math.max(1, Math.ceil(refundBoundedCount / ADMIN_FINANCE_PAGE_SIZE));
  const paymentPage = Math.min(filters.paymentPage, paymentPageCount);
  const refundPage = Math.min(filters.refundPage, refundPageCount);
  const [payments, refunds] = await Promise.all([
    prisma.paymentTransaction.findMany({
      include: { booking: { select: { confirmationCode: true, hotelSlug: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (paymentPage - 1) * ADMIN_FINANCE_PAGE_SIZE,
      take: ADMIN_FINANCE_PAGE_SIZE,
      where: paymentWhere,
    }),
    prisma.refundRequest.findMany({
      include: {
        booking: { select: { confirmationCode: true } },
        payment: { select: { provider: true, providerRef: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (refundPage - 1) * ADMIN_FINANCE_PAGE_SIZE,
      take: ADMIN_FINANCE_PAGE_SIZE,
      where: refundWhere,
    }),
  ]);
  const activeFilters = { ...filters, paymentPage, refundPage };

  return (
    <section className="account-page platform-admin-page">
      <header className="admin-hero">
        <div className="admin-hero__content">
          <p className="admin-hero__eyebrow">Audited money operations</p>
          <h1>Finance, refunds, and reconciliation</h1>
          <p>
            Review captured payments, provider totals, refund approvals, and immutable ledger
            entries.
          </p>
          <Link className="ui-button ui-button--secondary" href="/admin">
            Back to operations
          </Link>
        </div>
      </header>

      <div className="admin-overview-grid">
        <Card className="admin-metric admin-metric--primary">
          <span>Captured</span>
          <strong>{money(captured._sum.amount ?? 0, 'INR')}</strong>
        </Card>
        <Card className="admin-metric">
          <span>Approved refunds</span>
          <strong>{money(refunded._sum.amount ?? 0, 'INR')}</strong>
        </Card>
        <Card
          className={
            discrepancies
              ? 'admin-metric admin-metric--attention'
              : 'admin-metric admin-metric--clear'
          }
        >
          <span>Discrepancies</span>
          <strong>{discrepancies}</strong>
        </Card>
        <Card className="admin-metric">
          <span>Pending refunds</span>
          <strong>{pendingRefunds.toLocaleString('en-IN')}</strong>
        </Card>
        <Card className="admin-metric">
          <span>Allocated to suppliers</span>
          <strong>{money(supplierPayable._sum.amount ?? 0, 'INR')}</strong>
        </Card>
      </div>

      <form className="business-report__filters" method="get">
        <label className="ui-field business-report__search">
          <span className="ui-field__label">Payment or booking lookup</span>
          <input
            className="ui-input"
            defaultValue={filters.query}
            maxLength={100}
            name="q"
            placeholder="Booking, payment, provider, or hotel reference"
            type="search"
          />
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Payment status</span>
          <select className="ui-input" defaultValue={filters.paymentStatus} name="paymentStatus">
            {ADMIN_PAYMENT_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item === 'ALL' ? 'All payment statuses' : item}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Reconciliation</span>
          <select className="ui-input" defaultValue={filters.reconciliation} name="reconciliation">
            {ADMIN_RECONCILIATION_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item === 'ALL' ? 'All reconciliation states' : item.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Refund status</span>
          <select className="ui-input" defaultValue={filters.refundStatus} name="refundStatus">
            {ADMIN_REFUND_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item === 'ALL' ? 'All refund statuses' : item.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Created within</span>
          <select className="ui-input" defaultValue={filters.window} name="window">
            {ADMIN_FINANCE_WINDOWS.map((item) => (
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
          <Link className="ui-button ui-button--secondary" href="/admin/finance">
            Clear
          </Link>
        </div>
      </form>

      <div className="partner-bookings__summary">
        <Card>
          <span>Matching payments</span>
          <strong>{paymentCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Matching refunds</span>
          <strong>{refundCount.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Provider disclosure</span>
          <strong>Private references only</strong>
        </Card>
      </div>

      {paymentCount > ADMIN_FINANCE_RESULT_LIMIT || refundCount > ADMIN_FINANCE_RESULT_LIMIT ? (
        <Card className="ui-card--padded">
          <strong>Deep-history limit reached.</strong>
          <p>
            Refine the filters to review records beyond the first{' '}
            {ADMIN_FINANCE_RESULT_LIMIT.toLocaleString('en-IN')} matches in either register.
          </p>
        </Card>
      ) : null}

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Supplier destinations</p>
          <h2>Provider-tokenized payout accounts</h2>
          <p>
            Review masked destinations imported from the approved payout provider. Raw bank and UPI
            credentials must never be entered or stored in this portal.
          </p>
          <span className="admin-status-badge">
            Provider linking {payoutOnboardingEnabled ? 'enabled' : 'disabled'}
          </span>
        </div>
        {payoutOnboardingEnabled ? (
          <Card className="ui-card--padded">
            <h3>Import an approved provider destination</h3>
            <p>
              Enter only a provider-generated beneficiary token and masked display data. Never enter
              a full account number, UPI credential, PIN, password, or OTP.
            </p>
            <AdminPayoutAccountImport partners={payoutPartners} />
          </Card>
        ) : null}
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Masked destination</th>
                  <th>Status</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {payoutAccounts.map((account) => {
                  const masked = maskedPayoutDestination(account);
                  return (
                    <tr key={account.id}>
                      <td>
                        <strong>{account.partner.name}</strong>
                        <span>Imported {date(account.createdAt)}</span>
                      </td>
                      <td>
                        <strong>{masked.bankName}</strong>
                        <span>{masked.account}</span>
                        {masked.routingCodeMasked ? <span>{masked.routingCodeMasked}</span> : null}
                      </td>
                      <td>
                        <strong>{account.status.replaceAll('_', ' ')}</strong>
                        <span>{account.isDefault ? 'Current default' : 'Not default'}</span>
                        <span>Version {account.version}</span>
                      </td>
                      <td>
                        {account.status === 'PENDING_VERIFICATION' && payoutOnboardingEnabled ? (
                          <AdminPayoutAccountActions
                            accountId={account.id}
                            version={account.version}
                          />
                        ) : (
                          <span>
                            {account.reviewReason ||
                              (payoutOnboardingEnabled
                                ? 'No pending review action.'
                                : 'Review disabled until provider activation.')}
                          </span>
                        )}
                        <details>
                          <summary>Audit history ({account.events.length})</summary>
                          {account.events.map((event) => (
                            <span key={event.id}>
                              {event.action.replaceAll('_', ' ')} · {date(event.createdAt)} ·
                              version {event.version}
                            </span>
                          ))}
                        </details>
                      </td>
                    </tr>
                  );
                })}
                {payoutAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      No provider-tokenized payout destinations have been imported.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Reconciliation</p>
          <h2>Payment register</h2>
          <p>Provider evidence must be entered before a captured payment is marked matched.</p>
        </div>
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Payment</th>
                  <th>Amount</th>
                  <th>Reconciliation</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <strong>{payment.booking.confirmationCode}</strong>
                      <span>{payment.booking.hotelSlug}</span>
                    </td>
                    <td>
                      <strong>{payment.provider}</strong>
                      <span>
                        Private provider reference{' '}
                        {privateProviderReference(payment.provider, payment.providerRef)}
                      </span>
                      <span>{payment.environment} environment</span>
                      <span>{date(payment.createdAt)}</span>
                    </td>
                    <td>
                      <strong>{money(payment.amount, payment.currency)}</strong>
                      <span>{payment.status}</span>
                    </td>
                    <td>
                      <strong>{payment.reconciliationStatus}</strong>
                      <span>{redactFinanceNarrative(payment.reconciliationNote) || 'No note'}</span>
                    </td>
                    <td>
                      {canOperateOnPayment(payment.status) ? (
                        <AdminPaymentActions
                          amount={payment.amount}
                          currency={payment.currency}
                          paymentId={payment.id}
                        />
                      ) : (
                        'Available after capture'
                      )}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No payment transactions recorded.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
        <nav aria-label="Payment register pages" className="business-audit-pagination">
          {paymentPage > 1 ? (
            <Link
              className="ui-button ui-button--secondary"
              href={adminFinancePath(activeFilters, { paymentPage: paymentPage - 1 })}
            >
              Previous payments
            </Link>
          ) : (
            <span />
          )}
          <span>
            Payment page {paymentPage} of {paymentPageCount}
          </span>
          {paymentPage < paymentPageCount ? (
            <Link
              className="ui-button ui-button--secondary"
              href={adminFinancePath(activeFilters, { paymentPage: paymentPage + 1 })}
            >
              Next payments
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Refund governance</p>
          <h2>Refund queue</h2>
        </div>
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Amount</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((refund) => (
                  <tr key={refund.id}>
                    <td>
                      <strong>{refund.booking.confirmationCode}</strong>
                      <span>
                        Private provider reference{' '}
                        {privateProviderReference(
                          refund.payment.provider,
                          refund.payment.providerRef,
                        )}
                      </span>
                    </td>
                    <td>{money(refund.amount, refund.currency)}</td>
                    <td>{redactFinanceNarrative(refund.reason)}</td>
                    <td>
                      <strong>{refund.status}</strong>
                      <span>{refundReviewPosture(refund.status).replaceAll('_', ' ')}</span>
                      <span>
                        {redactFinanceNarrative(refund.reviewNote) || date(refund.createdAt)}
                      </span>
                    </td>
                    <td>
                      {['PENDING', 'PROVIDER_FAILED'].includes(refund.status) ? (
                        <AdminRefundActions
                          canReject={refund.status === 'PENDING'}
                          isRetry={refund.status === 'PROVIDER_FAILED'}
                          refundId={refund.id}
                        />
                      ) : (
                        'Reviewed'
                      )}
                    </td>
                  </tr>
                ))}
                {refunds.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No refund requests recorded.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
        <nav aria-label="Refund queue pages" className="business-audit-pagination">
          {refundPage > 1 ? (
            <Link
              className="ui-button ui-button--secondary"
              href={adminFinancePath(activeFilters, { refundPage: refundPage - 1 })}
            >
              Previous refunds
            </Link>
          ) : (
            <span />
          )}
          <span>
            Refund page {refundPage} of {refundPageCount}
          </span>
          {refundPage < refundPageCount ? (
            <Link
              className="ui-button ui-button--secondary"
              href={adminFinancePath(activeFilters, { refundPage: refundPage + 1 })}
            >
              Next refunds
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Accounting trace</p>
          <h2>Balanced financial journals</h2>
          <p>
            Every captured payment and approved refund produces immutable debit and credit postings.
            Unbalanced journals are rejected before storage.
          </p>
        </div>
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Journal</th>
                  <th>Reference</th>
                  <th>Postings</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {journals.map((journal) => (
                  <tr key={journal.id}>
                    <td>{date(journal.createdAt)}</td>
                    <td>
                      <strong>{journal.sourceType}</strong>
                      <span>{journal.status}</span>
                    </td>
                    <td>
                      Private journal reference{' '}
                      {privateProviderReference(journal.sourceType, journal.reference)}
                    </td>
                    <td>
                      {journal.postings.map((posting) => (
                        <span key={posting.id}>
                          {posting.direction} {posting.accountCode}:{' '}
                          {money(posting.amount, journal.currency)}
                        </span>
                      ))}
                    </td>
                    <td>
                      <strong>{money(journal.totalDebit, journal.currency)}</strong>
                    </td>
                  </tr>
                ))}
                {journals.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Journals appear after verified captures and refunds.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Supplier money movement</p>
          <h2>Tokenized payout batches</h2>
          <p>
            Only approved settlements with a verified provider-tokenized destination may enter a
            payout batch. Raw bank account details are never stored here.
          </p>
        </div>
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Batch</th>
                  <th>Suppliers</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {payoutBatches.map((batch) => (
                  <tr key={batch.id}>
                    <td>{date(batch.createdAt)}</td>
                    <td>
                      <strong>{batch.id}</strong>
                      <span>
                        {batch.providerBatchRef
                          ? `Provider acknowledgement ${privateProviderReference('payout', batch.providerBatchRef)}`
                          : 'Not submitted to provider'}
                      </span>
                    </td>
                    <td>
                      {batch.instructions.map((instruction) => (
                        <span key={instruction.id}>
                          {instruction.partner.name} · {instruction.status} ·{' '}
                          {money(instruction.amount, instruction.currency)}
                        </span>
                      ))}
                    </td>
                    <td>
                      <strong>{batch.status}</strong>
                      <span>{batch.instructionCount} instruction(s)</span>
                    </td>
                    <td>
                      <strong>{money(batch.totalAmount, batch.currency)}</strong>
                    </td>
                  </tr>
                ))}
                {payoutBatches.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No governed payout batches have been created.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Compatibility trace</p>
          <h2>Legacy financial ledger</h2>
          <p>Retained for existing reports while balanced journals become the source of truth.</p>
        </div>
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((entry) => (
                  <tr key={entry.id}>
                    <td>{date(entry.createdAt)}</td>
                    <td>{entry.entryType}</td>
                    <td>
                      Private ledger reference{' '}
                      {privateProviderReference(entry.entryType, entry.reference)}
                    </td>
                    <td>{redactFinanceNarrative(entry.description)}</td>
                    <td>
                      <strong>{money(entry.amount, entry.currency)}</strong>
                    </td>
                  </tr>
                ))}
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Ledger entries appear after reconciliations and approvals.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </section>
  );
}
