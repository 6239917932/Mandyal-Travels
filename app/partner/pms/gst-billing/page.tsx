import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerHotelGstWorkspace } from '@/services/partnerHotelReportingService';

export const metadata: Metadata = { title: 'GST preparation | Mandyal PMS' };

type PageProps = { searchParams: Promise<{ property?: string | string[] }> };
const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default async function PartnerPmsGstBillingPage({ searchParams }: PageProps) {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partner');
  if (access.memberRole !== 'ADMIN') {
    return (
      <main className="booking-page">
        <div className="booking-page__container">
          <Card>
            <h1>Administrator access required</h1>
            <p>
              Tax identity and property-wide booking values are restricted to hotel administrators.
            </p>
            <Link className="ui-button ui-button--secondary" href="/partner/pms">
              Return to PMS dashboard
            </Link>
          </Card>
        </div>
      </main>
    );
  }
  const values = await searchParams;
  const workspace = await getPartnerHotelGstWorkspace({
    memberRole: access.memberRole,
    partnerId: access.partnerId,
    requestedPropertyId: firstValue(values.property),
  });
  if (!('selectedProperty' in workspace)) {
    return (
      <main className="booking-page">
        <div className="booking-page__container">
          <header className="partner-page__heading">
            <div>
              <p className="hotel-page__eyebrow">Finance · controlled GST preparation</p>
              <h1>GST billing preparation</h1>
            </div>
          </header>
          <Card>
            <h2>No active managed hotel property</h2>
            <p>Add and activate a property before reviewing GST preparation statements.</p>
            <Link className="ui-button ui-button--primary" href="/partner/properties">
              Open property settings
            </Link>
          </Card>
        </div>
      </main>
    );
  }
  const property = workspace.selectedProperty;
  const identityReady =
    workspace.identity?.taxProfileVerified &&
    workspace.identity.gstRegistrationStatus === 'REGISTERED' &&
    Boolean(
      workspace.identity.gstin &&
      workspace.identity.legalName &&
      workspace.identity.registeredAddress,
    );

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Finance · controlled GST preparation</p>
            <h1>GST billing preparation</h1>
            <p className="booking-page__intro">
              Inspect immutable marketplace tax snapshots and supplier identity readiness without
              inventing a statutory invoice, tax split, credit note, or filing record.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner/tax">
              Tax tracker
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/pms/reports">
              Operational reports
            </Link>
          </div>
        </header>

        <p className="booking-page__payment-error" role="alert">
          Statutory GST invoice issuance is not enabled. The documents here are preparation
          statements only and must not be supplied to a customer as a tax invoice.
        </p>

        {!property ? (
          <Card>
            <h2>No active managed hotel property</h2>
            <p>Add and activate a property before reviewing GST preparation statements.</p>
            <Link className="ui-button ui-button--primary" href="/partner/properties">
              Open property settings
            </Link>
          </Card>
        ) : (
          <>
            <Card>
              <form action="/partner/pms/gst-billing" className="supplier-form__grid" method="get">
                <label className="ui-field supplier-form__full-width">
                  <span className="ui-field__label">Managed property</span>
                  <select className="ui-input" defaultValue={property.id} name="property">
                    {workspace.properties.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="ui-button ui-button--secondary" type="submit">
                  Open property
                </button>
              </form>
            </Card>

            {workspace.safetyLimitReached ? (
              <p className="booking-page__payment-error" role="alert">
                The display safety limit was reached. Narrow the operating dataset before relying on
                this register.
              </p>
            ) : null}

            <div className="partner-workspace__columns">
              <Card>
                <p className="hotel-page__eyebrow">Supplier identity</p>
                <h2>{workspace.identity?.legalName || 'Identity unavailable'}</h2>
                <p>
                  GST registration:{' '}
                  <strong>{workspace.identity?.gstRegistrationStatus ?? 'PENDING'}</strong>
                  <br />
                  GSTIN: <strong>{workspace.identity?.gstin || 'Not recorded'}</strong>
                  <br />
                  State code: <strong>{workspace.identity?.stateCode || 'Not recorded'}</strong>
                  <br />
                  Profile review:{' '}
                  <strong>{workspace.identity?.taxProfileVerified ? 'Verified' : 'Pending'}</strong>
                </p>
              </Card>
              <Card>
                <p className="hotel-page__eyebrow">Issuance gate</p>
                <h2>
                  {identityReady
                    ? 'Identity ready; issuance still disabled'
                    : 'Identity review incomplete'}
                </h2>
                <p>
                  Tax-adviser approval is still required for invoice numbering, place of supply,
                  SAC/HSN, CGST/SGST/IGST treatment, credit notes, retention and e-invoicing.
                </p>
              </Card>
            </div>

            <Card>
              <p className="hotel-page__eyebrow">Immutable marketplace tax register</p>
              <h2>{property.name}</h2>
              <div className="pms-room-rack__table-wrap">
                <table className="pms-room-rack__table">
                  <thead>
                    <tr>
                      <th scope="col">Booking</th>
                      <th scope="col">Stay</th>
                      <th scope="col">Taxable</th>
                      <th scope="col">GST</th>
                      <th scope="col">Snapshot total</th>
                      <th scope="col">Supplemental charges</th>
                      <th scope="col">Statement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.statements.map((statement) => (
                      <tr key={statement.confirmationCode}>
                        <th scope="row">
                          {statement.confirmationCode}
                          <br />
                          <small>{statement.customerName}</small>
                        </th>
                        <td>
                          {statement.from} – {statement.through}
                        </td>
                        <td>{money(statement.taxableAmount, statement.currency)}</td>
                        <td>{money(statement.gstAmount, statement.currency)}</td>
                        <td>{money(statement.totalAmount, statement.currency)}</td>
                        <td>
                          {statement.supplementalCurrencyConflict
                            ? 'Withheld · currency conflict'
                            : money(statement.supplementalChargeAmount, statement.currency)}
                          {!statement.supplementalCurrencyConflict &&
                          statement.supplementalChargeAmount ? (
                            <>
                              <br />
                              <small>Needs tax classification</small>
                            </>
                          ) : null}
                        </td>
                        <td>
                          <Link
                            href={`/partner/pms/gst-billing/${encodeURIComponent(statement.confirmationCode)}`}
                          >
                            Open preparation statement
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {!workspace.statements.length ? (
                      <tr>
                        <td colSpan={7}>
                          No confirmed booking tax snapshots exist for this property.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
