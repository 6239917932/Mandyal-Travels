import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import { boundedCustomerDocumentPage, customerDocumentCenterPath } from '@/lib/customerDocuments';
import {
  listCustomerDocuments,
  type CustomerDocumentCollection,
  type CustomerDocumentRecord,
} from '@/services/customerDocumentService';

export const metadata: Metadata = { title: 'Travel documents' };

type CustomerDocumentsPageProps = {
  searchParams: Promise<{
    hotelPage?: string | string[];
    tripPage?: string | string[];
  }>;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));
}

function readinessLabel(value: CustomerDocumentRecord['readiness']): string {
  if (value === 'READY') return 'Available';
  if (value === 'REVIEW') return 'Under review';
  return 'Unavailable';
}

function DocumentCards({ collection }: { collection: CustomerDocumentCollection }) {
  if (collection.records.length === 0) {
    return (
      <Card className="account-trips__empty">
        <strong>No documents are available in this section yet.</strong>
        <p>Completed and eligible bookings will appear here automatically.</p>
      </Card>
    );
  }

  return (
    <div className="account-trips__list">
      {collection.records.map((record) => (
        <Card className="account-trip" key={record.id}>
          <div className="account-trip__topline">
            <span className="account-trip__type">{record.productType}</span>
            <strong>{readinessLabel(record.readiness)}</strong>
          </div>
          <div className="account-trip__body">
            <div>
              <h3>{record.title}</h3>
              <p>{record.subtitle}</p>
            </div>
            <dl>
              <div>
                <dt>Booking reference</dt>
                <dd>{record.reference}</dd>
              </div>
              <div>
                <dt>Booking status</dt>
                <dd>{record.status}</dd>
              </div>
              <div>
                <dt>Recorded</dt>
                <dd>{formatDate(record.createdAt)}</dd>
              </div>
            </dl>
          </div>
          <p className="booking-confirmation__fine-print">{record.readinessMessage}</p>
          {record.documentLinks.length > 0 ? (
            <div className="account-trip__actions" aria-label={`Documents for ${record.reference}`}>
              {record.documentLinks.map((document) => (
                <Link
                  className="ui-button ui-button--secondary"
                  href={document.href}
                  key={document.href}
                >
                  {document.label}
                </Link>
              ))}
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

function Pagination({
  collection,
  hotelPage,
  kind,
  tripPage,
}: {
  collection: CustomerDocumentCollection;
  hotelPage: number;
  kind: 'hotel' | 'transport';
  tripPage: number;
}) {
  if (collection.pageCount <= 1) return null;
  const previousPages = {
    hotelPage: kind === 'hotel' ? collection.page - 1 : hotelPage,
    tripPage: kind === 'transport' ? collection.page - 1 : tripPage,
  };
  const nextPages = {
    hotelPage: kind === 'hotel' ? collection.page + 1 : hotelPage,
    tripPage: kind === 'transport' ? collection.page + 1 : tripPage,
  };
  return (
    <nav
      aria-label={`${kind === 'hotel' ? 'Hotel' : 'Transport'} document pages`}
      className="business-audit-pagination"
    >
      {collection.page > 1 ? (
        <Link
          className="ui-button ui-button--secondary"
          href={customerDocumentCenterPath(previousPages)}
        >
          Previous page
        </Link>
      ) : (
        <span />
      )}
      <span>
        Page {collection.page} of {collection.pageCount}
      </span>
      {collection.page < collection.pageCount ? (
        <Link
          className="ui-button ui-button--secondary"
          href={customerDocumentCenterPath(nextPages)}
        >
          Next page
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export default async function CustomerDocumentsPage({ searchParams }: CustomerDocumentsPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=%2Faccount%2Fdocuments');
  const parameters = await searchParams;
  const documents = await listCustomerDocuments({
    email: user.email,
    hotelPage: boundedCustomerDocumentPage(parameters.hotelPage),
    tripPage: boundedCustomerDocumentPage(parameters.tripPage),
    userId: user.id,
  });

  return (
    <section className="account-page" aria-labelledby="travel-documents-heading">
      <header className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Private booking records</p>
          <h1 id="travel-documents-heading">Travel documents</h1>
          <p>Open eligible documents connected to your signed-in Mandyal Travels account.</p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/account/trips">
          View travel history
        </Link>
      </header>

      <Card>
        <strong>Document status</strong>
        <p>
          Hotel billing documents are provisional payment receipts, not statutory GST tax invoices.
          Flight itineraries, bus tickets, and car vouchers remain clearly marked prototypes until
          their live providers complete fulfillment.
        </p>
      </Card>

      <div className="partner-bookings__summary" aria-label="Document totals">
        <Card>
          <span>Hotel document records</span>
          <strong>{documents.hotels.total.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Transport document records</span>
          <strong>{documents.transport.total.toLocaleString('en-IN')}</strong>
        </Card>
      </div>

      <section className="account-trips" aria-labelledby="hotel-documents-heading">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Stays</p>
          <h2 id="hotel-documents-heading">Hotel vouchers and receipts</h2>
          {documents.hotels.capped ? <p>Showing the latest 500 eligible records.</p> : null}
        </div>
        <DocumentCards collection={documents.hotels} />
        <Pagination
          collection={documents.hotels}
          hotelPage={documents.hotels.page}
          kind="hotel"
          tripPage={documents.transport.page}
        />
      </section>

      <section className="account-trips" aria-labelledby="transport-documents-heading">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Transport and rentals</p>
          <h2 id="transport-documents-heading">Prototype travel documents</h2>
          {documents.transport.capped ? <p>Showing the latest 500 eligible records.</p> : null}
        </div>
        <DocumentCards collection={documents.transport} />
        <Pagination
          collection={documents.transport}
          hotelPage={documents.hotels.page}
          kind="transport"
          tripPage={documents.transport.page}
        />
      </section>
    </section>
  );
}
