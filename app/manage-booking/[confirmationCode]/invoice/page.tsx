import Link from 'next/link';

import { BookingDocumentAccessDenied } from '@/components/booking/BookingDocumentAccessDenied';
import { PrintDocumentButton } from '@/components/booking/PrintDocumentButton';
import { getAuthorizedManagedBooking } from '@/lib/managedBooking';

interface InvoicePageProps {
  params: Promise<{ confirmationCode: string }>;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { confirmationCode } = await params;
  const booking = await getAuthorizedManagedBooking(confirmationCode);

  if (!booking) {
    return <BookingDocumentAccessDenied />;
  }

  return (
    <div className="booking-document-page">
      <div className="booking-document-actions">
        <Link href="/manage-booking">Back to Manage Booking</Link>
        <PrintDocumentButton label="Print or save invoice" />
      </div>
      <article className="booking-document">
        <header className="booking-document__header">
          <div>
            <span className="booking-document__brand">Mandyal Travels</span>
            <h1>Booking payment receipt</h1>
          </div>
          <div className="booking-document__status">
            <span>Receipt number</span>
            <strong>INV-{booking.confirmationCode.slice(2)}</strong>
          </div>
        </header>

        <section className="booking-document__section">
          <h2>Billed to</h2>
          <p>
            {booking.guest.firstName} {booking.guest.lastName}
          </p>
          <p>{booking.guest.email}</p>
        </section>

        <section className="booking-document__section">
          <h2>Booking charges</h2>
          <div className="booking-document__charges">
            {(booking.priceComponents ?? []).map((component) => (
              <div key={`${component.type}-${component.label}`}>
                <span>{component.label}</span>
                <strong>{formatCurrency(component.amount, component.currency)}</strong>
              </div>
            ))}
            <div className="booking-document__charges-total">
              <span>Total paid</span>
              <strong>{formatCurrency(booking.totalAmount, booking.currency)}</strong>
            </div>
          </div>
        </section>

        <section className="booking-document__reference">
          <div>
            <span>Booking reference</span>
            <strong>{booking.confirmationCode}</strong>
          </div>
          <div>
            <span>Payment status</span>
            <strong>{booking.paymentStatus === 'refunded' ? 'REFUNDED' : 'PAID'}</strong>
          </div>
        </section>

        <footer className="booking-document__footer">
          This development-stage document is a payment receipt, not a statutory GST tax invoice.
          Supplier tax registration and compliant invoicing will be connected before production.
        </footer>
      </article>
    </div>
  );
}
