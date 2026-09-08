import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { PrintDocumentButton } from '@/components/booking/PrintDocumentButton';
import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerHotelGstStatement } from '@/services/partnerHotelReportingService';

export const metadata: Metadata = { title: 'GST preparation statement | Mandyal PMS' };

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', { currency, style: 'currency' }).format(amount);
}

export default async function PartnerPmsGstStatementPage({
  params,
}: {
  params: Promise<{ confirmationCode: string }>;
}) {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partner');
  if (access.memberRole !== 'ADMIN') redirect('/partner/pms');
  const { confirmationCode } = await params;
  const result = await getPartnerHotelGstStatement({
    confirmationCode,
    memberRole: access.memberRole,
    partnerId: access.partnerId,
  });
  if (!result) notFound();
  const { identity, statement } = result;

  return (
    <main className="booking-document">
      <div className="booking-document__toolbar">
        <Link className="ui-button ui-button--secondary" href="/partner/pms/gst-billing">
          Back to GST preparation
        </Link>
        <PrintDocumentButton label="Print preparation statement" />
      </div>
      <article className="booking-document__paper">
        <p className="hotel-page__eyebrow">Controlled finance working paper</p>
        <h1>GST preparation statement</h1>
        <p className="booking-page__payment-error" role="alert">
          <strong>NOT A TAX INVOICE</strong>
        </p>
        <p>
          This working paper reproduces the booking&apos;s immutable marketplace tax snapshot. It
          has no statutory invoice number and is not a GST return, credit note, or e-invoice.
        </p>
        {result.safetyLimitReached ? (
          <p className="booking-page__payment-error">
            The supplemental folio dataset is incomplete because its safety limit was reached.
          </p>
        ) : null}
        <Card>
          <h2>Supplier identity under review</h2>
          <p>
            <strong>{identity.legalName}</strong>
            <br />
            {identity.registeredAddress || 'Registered address not recorded'}
            <br />
            GSTIN: {identity.gstin || 'Not recorded'} · State code:{' '}
            {identity.stateCode || 'Not recorded'}
            <br />
            Tax profile: {identity.taxProfileVerified ? 'Verified' : 'Pending review'} · GST
            registration: {identity.gstRegistrationStatus}
          </p>
        </Card>
        <Card>
          <h2>Booking tax snapshot</h2>
          <dl className="booking-detail__summary-list">
            <div>
              <dt>Confirmation</dt>
              <dd>{statement.confirmationCode}</dd>
            </div>
            <div>
              <dt>Primary guest</dt>
              <dd>{statement.customerName}</dd>
            </div>
            <div>
              <dt>Stay</dt>
              <dd>
                {statement.from} – {statement.through}
              </dd>
            </div>
            <div>
              <dt>Snapshot created</dt>
              <dd>{new Date(statement.createdAt).toLocaleString('en-IN')}</dd>
            </div>
            <div>
              <dt>Taxable amount</dt>
              <dd>{money(statement.taxableAmount, statement.currency)}</dd>
            </div>
            <div>
              <dt>GST recorded</dt>
              <dd>{money(statement.gstAmount, statement.currency)}</dd>
            </div>
            <div>
              <dt>Customer total</dt>
              <dd>
                <strong>{money(statement.totalAmount, statement.currency)}</strong>
              </dd>
            </div>
            <div>
              <dt>Tax rule version</dt>
              <dd>{statement.ruleVersion}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <h2>Supplemental folio charges</h2>
          <p>
            <strong>
              {statement.supplementalCurrencyConflict
                ? 'Withheld · currency conflict'
                : money(statement.supplementalChargeAmount, statement.currency)}
            </strong>
          </p>
          <p>
            These append-only property charges are shown separately. They are not included in the
            immutable marketplace tax snapshot and require approved tax classification before any
            statutory invoice implementation.
          </p>
        </Card>
        <Card>
          <h2>Statutory issuance blockers</h2>
          <ul>
            <li>Approved invoice series and immutable statutory numbering.</li>
            <li>Validated place-of-supply and CGST/SGST/IGST determination.</li>
            <li>
              Approved SAC/HSN classification for accommodation and every supplemental charge.
            </li>
            <li>Credit-note, retention, reconciliation and e-invoice rules where applicable.</li>
          </ul>
        </Card>
      </article>
    </main>
  );
}
