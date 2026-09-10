import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  HotelDiscountForm,
  HotelSplitPaymentForm,
} from '@/components/partner/HotelSplitBillingControls';
import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerHotelFolioWorkspace } from '@/services/partnerHotelFolioService';

export const metadata: Metadata = { title: 'Split billing and discounts | Mandyal PMS' };

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function money(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default async function PartnerSplitBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string | string[] }>;
}) {
  const access = await getPartnerAccess();
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') redirect('/partner');
  const values = await searchParams;
  const workspace = await getPartnerHotelFolioWorkspace({
    actorUserId: access.userId,
    partnerId: access.partnerId,
    requestedConfirmationCode: firstValue(values.booking),
  });
  const folio = workspace.selectedFolio;
  const isAdmin = access.memberRole === 'ADMIN';

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Finance · controlled folio allocation</p>
            <h1>Split billing and discounts</h1>
            <p className="booking-page__intro">
              Divide an outstanding balance between payers or apply an approved discount without
              changing the original booking value or deleting financial history.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link
              className="ui-button ui-button--secondary"
              href={
                folio
                  ? `/partner/pms/billing?booking=${encodeURIComponent(folio.confirmationCode)}`
                  : '/partner/pms/billing'
              }
            >
              Billing and cashier
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/pms">
              PMS dashboard
            </Link>
          </div>
        </header>

        {!isAdmin ? (
          <Card role="status">
            <h2>Administrator approval required</h2>
            <p>Only a partner administrator can apply discounts or record split payments.</p>
          </Card>
        ) : workspace.safetyLimitReached ? (
          <Card role="alert">
            <h2>Safety limit reached</h2>
            <p>Contact the platform administrator before recording more folio activity.</p>
          </Card>
        ) : workspace.stays.length && folio ? (
          <>
            <Card>
              <form
                action="/partner/pms/split-billing"
                className="supplier-form__grid"
                method="get"
              >
                <label className="ui-field supplier-form__full-width">
                  <span className="ui-field__label">Active reservation or in-house stay</span>
                  <select className="ui-input" defaultValue={folio.confirmationCode} name="booking">
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
            <div className="partner-bookings__summary">
              <Card>
                <span>Guest</span>
                <strong>{folio.guestName}</strong>
              </Card>
              <Card>
                <span>Current balance</span>
                <strong>{money(folio.balance, folio.currency)}</strong>
              </Card>
              <Card>
                <span>Reference</span>
                <strong>{folio.confirmationCode}</strong>
              </Card>
            </div>
            {folio.balance > 0 ? (
              <div className="partner-workspace__columns">
                <Card>
                  <p className="hotel-page__eyebrow">Complete settlement</p>
                  <h2>Split between payers</h2>
                  <HotelSplitPaymentForm
                    balance={folio.balance}
                    confirmationCode={folio.confirmationCode}
                    hasActiveShift={Boolean(workspace.activeShift)}
                  />
                </Card>
                <Card>
                  <p className="hotel-page__eyebrow">Administrator control</p>
                  <h2>Apply a discount</h2>
                  <HotelDiscountForm
                    balance={folio.balance}
                    confirmationCode={folio.confirmationCode}
                  />
                </Card>
              </div>
            ) : (
              <Card role="status">
                <h2>Folio is settled</h2>
                <p>No positive balance remains to split or discount.</p>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <h2>No active hotel folios</h2>
            <p>Create or confirm a reservation before splitting a bill.</p>
            <Link className="ui-button ui-button--primary" href="/partner/pms/walk-in">
              Create walk-in booking
            </Link>
          </Card>
        )}
      </div>
    </main>
  );
}
