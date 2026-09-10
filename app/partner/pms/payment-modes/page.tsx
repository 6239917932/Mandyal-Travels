import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerPaymentModeOperations } from '@/services/partnerPaymentModeOperationsService';

export const metadata: Metadata = { title: 'Multiple payment modes | Mandyal PMS' };

const modeLabels: Record<string, string> = {
  BANK_TRANSFER: 'Bank transfer at property',
  CARD: 'Card recorded at property',
  CASH: 'Cash',
  UPI: 'UPI recorded at property',
};

function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

function dateTime(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
    : 'Not recorded';
}

export default async function PartnerPaymentModesPage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') redirect('/partner');
  const workspace = await getPartnerPaymentModeOperations(access.partnerId);

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Finance · evidence-based payment classification</p>
            <h1>Multiple payment modes</h1>
            <p className="booking-page__intro">
              Compare append-only at-property receipts with separately recorded online provider
              transactions. Cash, card, UPI, and bank-transfer folio entries are operational
              records—not proof of bank, card-network, or UPI-provider authorization.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner/pms/billing">
              Billing and cashier
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/pms/split-billing">
              Split billing
            </Link>
          </div>
        </header>

        {workspace.safetyLimitReached ? (
          <p className="booking-page__payment-error" role="alert">
            Display safety limit reached. Metrics are bounded; review retained finance records from
            platform administration before relying on totals.
          </p>
        ) : null}

        <div className="partner-bookings__summary">
          {workspace.modes.map((mode) => (
            <Card key={mode.category}>
              <span>{modeLabels[mode.category] ?? mode.category}</span>
              <strong>{mode.paymentCount}</strong>
              <small>
                {mode.reversalCount} reversal{mode.reversalCount === 1 ? '' : 's'} ·{' '}
                {mode.currencyTotals.length
                  ? mode.currencyTotals
                      .map((total) => money(total.amount, total.currency))
                      .join(' · ')
                  : 'No net receipts'}
              </small>
            </Card>
          ))}
        </div>

        <div className="partner-workspace__columns">
          <Card>
            <p className="hotel-page__eyebrow">At-property controls</p>
            <h2>Cashier and folio evidence</h2>
            <p>
              {workspace.cashier.openShifts} open cashier shift
              {workspace.cashier.openShifts === 1 ? '' : 's'} · {workspace.cashier.closedShifts}{' '}
              closed shift{workspace.cashier.closedShifts === 1 ? '' : 's'}.
            </p>
            <p>
              Property payments are immutable folio postings. Corrections are linked reversals; this
              workspace does not edit entries or claim external settlement.
            </p>
          </Card>
          <Card>
            <p className="hotel-page__eyebrow">Online provider records</p>
            <h2>{workspace.online.capturedCount} captured payment records</h2>
            <p>
              {workspace.online.totalCount} provider transaction record
              {workspace.online.totalCount === 1 ? '' : 's'} ·{' '}
              {workspace.online.providerAcknowledgedCount} with a recorded provider reference.
            </p>
            <p>
              A captured status and provider reference are displayed as stored evidence only.
              Reconciliation is shown separately and is never inferred.
            </p>
          </Card>
        </div>

        <Card>
          <p className="hotel-page__eyebrow">Append-only property receipts</p>
          <h2>Recent cash, card, UPI, and bank-transfer entries</h2>
          {workspace.recentPropertyEntries.length ? (
            <div className="pms-room-rack__table-wrap">
              <table className="pms-room-rack__table">
                <thead>
                  <tr>
                    <th scope="col">Business date</th>
                    <th scope="col">Booking</th>
                    <th scope="col">Mode</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.recentPropertyEntries.map((entry, index) => (
                    <tr key={`${entry.createdAt.toISOString()}-${entry.confirmationCode}-${index}`}>
                      <td>{entry.businessDate}</td>
                      <th scope="row">{entry.confirmationCode}</th>
                      <td>{modeLabels[entry.category] ?? entry.category}</td>
                      <td>
                        {entry.entryType === 'REVERSAL' ? '−' : ''}
                        {money(entry.amount, entry.currency)}
                      </td>
                      <td>
                        {entry.entryType.toLowerCase()} · {entry.description}
                        <small>
                          Recorded {dateTime(entry.createdAt)} · at-property record only
                        </small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No at-property payment entries have been recorded.</p>
          )}
        </Card>

        <Card>
          <p className="hotel-page__eyebrow">Provider transaction evidence</p>
          <h2>Recent online payment records</h2>
          {workspace.online.recent.length ? (
            <div className="pms-room-rack__table-wrap">
              <table className="pms-room-rack__table">
                <thead>
                  <tr>
                    <th scope="col">Created</th>
                    <th scope="col">Booking</th>
                    <th scope="col">Provider</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Status and reconciliation</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.online.recent.map((payment, index) => (
                    <tr
                      key={`${payment.createdAt.toISOString()}-${payment.confirmationCode}-${index}`}
                    >
                      <td>{dateTime(payment.createdAt)}</td>
                      <th scope="row">{payment.confirmationCode}</th>
                      <td>
                        {payment.provider || 'Provider not named'}
                        <small>{payment.environment.toLowerCase()} environment</small>
                      </td>
                      <td>{money(payment.amount, payment.currency)}</td>
                      <td>
                        {payment.status.toLowerCase()} ·{' '}
                        {payment.reconciliationStatus.toLowerCase().replaceAll('_', ' ')}
                        <small>
                          Provider acknowledgement{' '}
                          {payment.providerAcknowledgementRecorded ? 'recorded' : 'not recorded'}
                        </small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No online provider transactions have been recorded for managed properties.</p>
          )}
        </Card>

        <Card>
          <p>
            Use Billing and cashier to record an at-property payment, and Split billing to allocate
            folio balances between payers. Online capture, provider reconciliation, refunds, and
            settlement remain separate governed records.
          </p>
        </Card>
      </div>
    </main>
  );
}
