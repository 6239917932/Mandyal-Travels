import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  CashierShiftControls,
  FolioPostingControls,
  FolioReversalButton,
} from '@/components/partner/HotelFolioControls';
import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerHotelFolioWorkspace } from '@/services/partnerHotelFolioService';

export const metadata: Metadata = { title: 'Billing and cashier | Mandyal PMS' };

type BillingPageProps = {
  searchParams: Promise<{ booking?: string | string[] }>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function money(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

function postingLabel(value: string): string {
  return value.replaceAll('_', ' ').toLowerCase();
}

export default async function PartnerPmsBillingPage({ searchParams }: BillingPageProps) {
  const access = await getPartnerAccess();
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') redirect('/partner');
  const values = await searchParams;
  const workspace = await getPartnerHotelFolioWorkspace({
    actorUserId: access.userId,
    partnerId: access.partnerId,
    requestedConfirmationCode: firstValue(values.booking),
  });
  const isAdmin = access.memberRole === 'ADMIN';
  const folio = workspace.selectedFolio;
  const selectedProperty = folio
    ? workspace.properties.find((property) => property.id === folio.propertyId)
    : workspace.properties[0];

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Finance · append-only audit trail</p>
            <h1>Billing and cashier</h1>
            <p className="booking-page__intro">
              Review each active stay folio, post property charges or partial deposits, and
              reconcile cashier receipts without overwriting financial history.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner/bookings">
              Open Front desk
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/pms">
              PMS dashboard
            </Link>
          </div>
        </header>

        {workspace.safetyLimitReached ? (
          <p className="booking-page__payment-error" role="alert">
            Display safety limit reached. Contact the platform administrator before recording more
            folio activity.
          </p>
        ) : null}

        <Card>
          <p className="hotel-page__eyebrow">Cashier shift</p>
          <h2>{selectedProperty?.name ?? 'Managed property'}</h2>
          <p>
            Business date: {selectedProperty?.businessDate ?? 'Unavailable'} · Cash payments and
            payment reversals require an open administrator shift.
          </p>
          <CashierShiftControls
            activeShift={workspace.activeShift}
            isAdmin={isAdmin}
            propertyId={selectedProperty?.id}
          />
        </Card>

        {workspace.stays.length ? (
          <Card>
            <form action="/partner/pms/billing" className="supplier-form__grid" method="get">
              <label className="ui-field supplier-form__full-width">
                <span className="ui-field__label">Active reservation or in-house stay</span>
                <select className="ui-input" defaultValue={folio?.confirmationCode} name="booking">
                  {workspace.stays.map((stay) => (
                    <option key={stay.confirmationCode} value={stay.confirmationCode}>
                      {stay.confirmationCode} · {stay.guestName} · {stay.propertyName}
                    </option>
                  ))}
                </select>
              </label>
              <button className="ui-button ui-button--secondary" type="submit">
                Open folio
              </button>
            </form>
          </Card>
        ) : (
          <Card>
            <h2>No active hotel folios</h2>
            <p>Create or confirm a reservation before posting a charge or property payment.</p>
            <Link className="ui-button ui-button--primary" href="/partner/pms/walk-in">
              Create walk-in booking
            </Link>
          </Card>
        )}

        {folio ? (
          <>
            <div className="partner-bookings__summary">
              <Card>
                <span>Total charges</span>
                <strong>{money(folio.charges, folio.currency)}</strong>
              </Card>
              <Card>
                <span>Total payments</span>
                <strong>{money(folio.payments, folio.currency)}</strong>
              </Card>
              <Card>
                <span>{folio.balance > 0 ? 'Balance due' : 'Folio balance'}</span>
                <strong>{money(folio.balance, folio.currency)}</strong>
              </Card>
            </div>

            <div className="partner-workspace__columns">
              <Card>
                <p className="hotel-page__eyebrow">Selected folio</p>
                <h2>{folio.guestName}</h2>
                <p>
                  {folio.confirmationCode} · {folio.propertyName}
                </p>
                <p>
                  {folio.checkInDate} to {folio.checkOutDate} ·{' '}
                  {postingLabel(folio.operationalStatus)}
                </p>
                <FolioPostingControls
                  activeShift={workspace.activeShift}
                  confirmationCode={folio.confirmationCode}
                  isAdmin={isAdmin}
                />
              </Card>

              <Card>
                <p className="hotel-page__eyebrow">Posting controls</p>
                <h2>Audited ledger</h2>
                <p>
                  Posted entries cannot be edited or deleted. Administrators correct mistakes by
                  adding a linked reversal. Checkout remains locked while the balance is positive.
                </p>
                <p>
                  This is a provisional operational folio, not a GST tax invoice or payment-gateway
                  refund record.
                </p>
              </Card>
            </div>

            <Card>
              <p className="hotel-page__eyebrow">Folio ledger</p>
              <ul className="pms-room-rack__queue-list">
                <li>
                  <strong>
                    Accommodation charge · {money(folio.accommodationAmount, folio.currency)}
                  </strong>
                  <span>Confirmed booking value</span>
                  <small>System-derived · cannot be edited here</small>
                </li>
                {folio.onlinePayment ? (
                  <li>
                    <strong>
                      Captured online payment · {money(folio.onlinePayment.amount, folio.currency)}
                    </strong>
                    <span>{folio.onlinePayment.provider}</span>
                    <small>System-derived payment record · cannot be edited here</small>
                  </li>
                ) : null}
                {folio.onlineRefundAmount > 0 ? (
                  <li>
                    <strong>
                      Approved online refund · {money(folio.onlineRefundAmount, folio.currency)}
                    </strong>
                    <span>Reduces the captured payment applied to this folio</span>
                    <small>System-derived refund record · cannot be changed here</small>
                  </li>
                ) : null}
                {folio.entries.map((entry) => {
                  const mayReverse =
                    isAdmin &&
                    entry.entryType !== 'REVERSAL' &&
                    !entry.reversed &&
                    (entry.entryType !== 'PAYMENT' || Boolean(workspace.activeShift));
                  return (
                    <li key={entry.id}>
                      <strong>
                        {postingLabel(entry.entryType)} · {money(entry.amount, folio.currency)}
                        {entry.reversed ? ' · reversed' : ''}
                      </strong>
                      <span>
                        {postingLabel(entry.category)} · {entry.description}
                      </span>
                      <small>
                        Business date {entry.businessDate} ·{' '}
                        {new Date(entry.createdAt).toLocaleString('en-IN')}
                        {entry.reversalOfType
                          ? ` · reverses ${postingLabel(entry.reversalOfType)}`
                          : ''}
                      </small>
                      {mayReverse ? (
                        <FolioReversalButton
                          confirmationCode={folio.confirmationCode}
                          entryId={entry.id}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Card>
          </>
        ) : null}
      </div>
    </main>
  );
}
