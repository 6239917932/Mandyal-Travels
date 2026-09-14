import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PrintDocumentButton } from '@/components/booking/PrintDocumentButton';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { normalizeHotelBookingReference } from '@/services/customerHotelBookingDetailRules';
import { getPartnerHotelFolioWorkspace } from '@/services/partnerHotelFolioService';

export const metadata: Metadata = { title: 'Operational guest folio | Mandyal PMS' };

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

function label(value: string): string {
  return value.replaceAll('_', ' ').toLowerCase();
}

export default async function OperationalFolioPage({
  params,
}: {
  params: Promise<{ confirmationCode: string }>;
}) {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partner');
  const { confirmationCode: rawReference } = await params;
  const confirmationCode = normalizeHotelBookingReference(rawReference);
  if (!confirmationCode) redirect('/partner/pms/billing');
  const workspace = await getPartnerHotelFolioWorkspace({
    partnerId: access.partnerId,
    requestedConfirmationCode: confirmationCode,
  });
  const folio = workspace.selectedFolio;
  if (!folio || folio.confirmationCode !== confirmationCode || workspace.safetyLimitReached) {
    redirect('/partner/pms/billing');
  }

  return (
    <div className="booking-document-page">
      <div className="booking-document-actions">
        <Link href={`/partner/pms/billing?booking=${encodeURIComponent(confirmationCode)}`}>
          Back to billing and cashier
        </Link>
        <PrintDocumentButton label="Print or save operational folio" />
      </div>
      <article
        className="booking-document hotel-operational-document"
        data-document-template={folio.documentProfile.template}
        data-document-theme={folio.documentProfile.theme}
      >
        <header className="booking-document__header">
          <div>
            <span className="booking-document__brand">Mandyal Travels · hotel operations</span>
            <h1>{folio.propertyName}</h1>
            {folio.documentProfile.headerText ? <p>{folio.documentProfile.headerText}</p> : null}
          </div>
          <div className="booking-document__status">
            <span>Document type</span>
            <strong>GUEST FOLIO</strong>
          </div>
        </header>

        <section className="booking-document__reference">
          <span>Booking reference</span>
          <strong>{folio.confirmationCode}</strong>
        </section>

        <section className="booking-document__section">
          <h2>Stay details</h2>
          <dl className="booking-document__grid">
            <div>
              <dt>Guest</dt>
              <dd>{folio.guestName}</dd>
            </div>
            <div>
              <dt>Stay</dt>
              <dd>
                {folio.checkInDate} to {folio.checkOutDate}
              </dd>
            </div>
            <div>
              <dt>Stay status</dt>
              <dd>{label(folio.operationalStatus)}</dd>
            </div>
            <div>
              <dt>Currency</dt>
              <dd>{folio.currency}</dd>
            </div>
          </dl>
        </section>

        <section className="booking-document__section">
          <h2>Operational ledger</h2>
          <div className="booking-document__charges">
            <div>
              <span>Confirmed accommodation</span>
              <strong>{money(folio.accommodationAmount, folio.currency)}</strong>
            </div>
            {folio.entries.map((entry) => (
              <div key={entry.id}>
                <span>
                  {label(entry.category)} · {entry.description}
                  {entry.reversed ? ' · reversed' : ''}
                </span>
                <strong>
                  {entry.entryType === 'PAYMENT' ? '−' : ''}
                  {money(entry.amount, folio.currency)}
                </strong>
              </div>
            ))}
            <div className="booking-document__charges-total">
              <span>Balance due</span>
              <strong>{money(folio.balance, folio.currency)}</strong>
            </div>
          </div>
        </section>

        <section className="booking-document__reference">
          <span>Important</span>
          <strong>OPERATIONAL FOLIO · NOT A TAX INVOICE</strong>
        </section>

        <footer className="booking-document__footer">
          {folio.documentProfile.footerText ? <p>{folio.documentProfile.footerText}</p> : null}
          {folio.documentProfile.showPropertyContact ? (
            <p>
              Property contact: {folio.propertyContact.email} · {folio.propertyContact.phone}
            </p>
          ) : null}
          <p>
            This document presents operational stay activity only. It does not replace a GST tax
            invoice, payment-provider receipt, refund record, or settlement statement.
          </p>
        </footer>
      </article>
    </div>
  );
}
