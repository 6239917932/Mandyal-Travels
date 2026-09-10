import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { TallyExportRuleError } from '@/lib/pms/tallyExport';
import { getPartnerTallyExport } from '@/services/partnerTallyExportService';

export const metadata: Metadata = { title: 'Tally XML export | Mandyal PMS' };

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function money(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default async function PartnerTallyExportPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string | string[];
    property?: string | string[];
    through?: string | string[];
  }>;
}) {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partner');
  if (access.memberRole !== 'ADMIN') {
    return (
      <main className="booking-page">
        <div className="booking-page__container">
          <Card role="status">
            <h1>Administrator access required</h1>
            <p>Accounting exports are restricted to hotel partner administrators.</p>
            <Link className="ui-button ui-button--secondary" href="/partner/pms">
              Return to PMS dashboard
            </Link>
          </Card>
        </div>
      </main>
    );
  }
  const values = await searchParams;
  let result;
  let rangeError = '';
  try {
    result = await getPartnerTallyExport({
      from: firstValue(values.from),
      partnerId: access.partnerId,
      propertyId: firstValue(values.property),
      through: firstValue(values.through),
    });
  } catch (error) {
    if (!(error instanceof TallyExportRuleError)) throw error;
    rangeError = error.message;
    result = await getPartnerTallyExport({ partnerId: access.partnerId });
  }
  const downloadQuery = result.selectedProperty
    ? new URLSearchParams({
        from: result.from,
        property: result.selectedProperty.id,
        through: result.through,
      }).toString()
    : '';
  const canExport =
    Boolean(result.selectedProperty) &&
    result.eligibleJournals.length > 0 &&
    !result.safetyLimitReached &&
    !rangeError;

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Accounting · controlled data bridge</p>
            <h1>Tally-compatible XML export</h1>
            <p className="booking-page__intro">
              Download a deterministic partner projection of posted, balanced INR journals for
              review and controlled import into Tally.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner/pms/accounting">
              Accounting ledger
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/pms">
              PMS dashboard
            </Link>
          </div>
        </header>

        <Card>
          <form className="supplier-form__grid" method="get">
            <label className="ui-field">
              <span className="ui-field__label">Managed property</span>
              <select
                className="ui-input"
                defaultValue={result.selectedProperty?.id}
                name="property"
                required
              >
                {result.properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="ui-field">
              <span className="ui-field__label">From</span>
              <input
                className="ui-input"
                defaultValue={result.from}
                name="from"
                required
                type="date"
              />
            </label>
            <label className="ui-field">
              <span className="ui-field__label">Through</span>
              <input
                className="ui-input"
                defaultValue={result.through}
                name="through"
                required
                type="date"
              />
            </label>
            <button className="ui-button ui-button--secondary" type="submit">
              Review export scope
            </button>
          </form>
          {rangeError ? (
            <p className="booking-page__payment-error" role="alert">
              {rangeError}
            </p>
          ) : null}
        </Card>

        <div className="partner-bookings__summary">
          <Card>
            <span>Eligible journals</span>
            <strong>{result.eligibleJournals.length}</strong>
            <small>Posted, balanced, INR and partner-attributed</small>
          </Card>
          <Card>
            <span>Partner debit postings</span>
            <strong>{money(result.partnerDebit ?? 0)}</strong>
          </Card>
          <Card>
            <span>Partner credit postings</span>
            <strong>{money(result.partnerCredit ?? 0)}</strong>
          </Card>
          <Card>
            <span>Excluded journals</span>
            <strong>{result.excludedCount}</strong>
            <small>Invalid, unsupported or incomplete records</small>
          </Card>
        </div>

        {result.safetyLimitReached ? (
          <Card role="alert">
            <h2>Export safety limit reached</h2>
            <p>Narrow the date range before preparing the XML file.</p>
          </Card>
        ) : null}

        <Card>
          <p className="hotel-page__eyebrow">Controlled download</p>
          <h2>Partner accounting projection</h2>
          <p>
            The XML contains only supplier-attributed journal lines and a derived Mandyal settlement
            clearing counter-entry so every voucher remains balanced. It does not expose platform
            accounts or other suppliers.
          </p>
          {canExport ? (
            <a
              className="ui-button ui-button--primary"
              download
              href={`/api/v1/partner/tally-export?${downloadQuery}`}
            >
              Download reviewed XML
            </a>
          ) : (
            <p role="status">
              No eligible journals are available for the selected property and dates.
            </p>
          )}
        </Card>

        <Card>
          <p className="hotel-page__eyebrow">Important boundary</p>
          <h2>Review before importing</h2>
          <p>
            This is a Tally-compatible technical foundation, not a statutory book, GST return,
            filing, accountant approval, or guarantee that ledger names match your Tally company. A
            qualified accountant must review ledger mappings, opening balances and tax treatment
            before production import.
          </p>
        </Card>
      </div>
    </main>
  );
}
