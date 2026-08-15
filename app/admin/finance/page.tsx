import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminPaymentActions, AdminRefundActions } from '@/components/admin/AdminFinanceActions';
import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Finance operations' };

function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { currency, style: 'currency' }).format(amount);
}

function date(value: Date) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    value,
  );
}

export default async function AdminFinancePage() {
  const administrator = await getPlatformAdmin();
  if (!administrator) redirect('/login?returnTo=/admin/finance');

  const [payments, refunds, captured, refunded, discrepancies, ledger] = await Promise.all([
    prisma.paymentTransaction.findMany({
      include: { booking: { select: { confirmationCode: true, hotelSlug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.refundRequest.findMany({
      include: {
        booking: { select: { confirmationCode: true } },
        payment: { select: { providerRef: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.paymentTransaction.aggregate({ _sum: { amount: true }, where: { status: 'captured' } }),
    prisma.refundRequest.aggregate({ _sum: { amount: true }, where: { status: 'APPROVED' } }),
    prisma.paymentTransaction.count({ where: { reconciliationStatus: 'DISCREPANCY' } }),
    prisma.financialLedgerEntry.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);

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
          <strong>{refunds.filter((refund) => refund.status === 'PENDING').length}</strong>
        </Card>
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Reconciliation</p>
          <h2>Payment register</h2>
          <p>
            Latest 100 payments. Provider evidence must be entered before a payment is marked
            matched.
          </p>
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
                      <span>{payment.providerRef}</span>
                      <span>{date(payment.createdAt)}</span>
                    </td>
                    <td>
                      <strong>{money(payment.amount, payment.currency)}</strong>
                      <span>{payment.status}</span>
                    </td>
                    <td>
                      <strong>{payment.reconciliationStatus}</strong>
                      <span>{payment.reconciliationNote || 'No note'}</span>
                    </td>
                    <td>
                      <AdminPaymentActions
                        amount={payment.amount}
                        currency={payment.currency}
                        paymentId={payment.id}
                      />
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
                      <span>{refund.payment.providerRef}</span>
                    </td>
                    <td>{money(refund.amount, refund.currency)}</td>
                    <td>{refund.reason}</td>
                    <td>
                      <strong>{refund.status}</strong>
                      <span>{refund.reviewNote || date(refund.createdAt)}</span>
                    </td>
                    <td>
                      {refund.status === 'PENDING' ? (
                        <AdminRefundActions refundId={refund.id} />
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
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Accounting trace</p>
          <h2>Financial ledger</h2>
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
                    <td>{entry.reference}</td>
                    <td>{entry.description}</td>
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
