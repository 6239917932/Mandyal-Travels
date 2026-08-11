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
            <div>
              <span>Current booking total</span>
              <strong>{formatCurrency(booking.totalAmount, booking.currency)}</strong>
            </div>
            <div className="booking-document__charges-total">
              <span>Payment received</span>
              <strong>{formatCurrency(booking.paymentAmount, booking.currency)}</strong>
            </div>
            {booking.status === 'confirmed' &&
            booking.paymentStatus === 'captured' &&
            booking.totalAmount !== booking.paymentAmount ? (
              <div>
                <span>
                  {booking.totalAmount > booking.paymentAmount
                    ? 'Pending additional payment'
                    : 'Pending refund adjustment'}
                </span>
                <strong>
                  {formatCurrency(
                    Math.abs(booking.totalAmount - booking.paymentAmount),
                    booking.currency,
                  )}
                </strong>
              </div>
            ) : null}
          </div>
        </section>

        <section className="booking-document__reference">
          <div>
            <span>Booking reference</span>
            <strong>{booking.confirmationCode}</strong>
          </div>
          <div>
            <span>Payment status</span>
            <strong>
              {booking.paymentStatus === 'refunded'
                ? 'REFUNDED'
                : booking.status !== 'confirmed' || booking.totalAmount === booking.paymentAmount
                  ? 'PAID'
                  : 'ADJUSTMENT PENDING'}
            </strong>
          </div>
        </section>

        <footer className="booking-document__footer">
          This development-stage document is a payment receipt, not a statutory GST tax invoice.
          Approved date-change price differences remain pending until a payment provider completes
          the additional charge or refund. Supplier tax registration and compliant invoicing will be
          connected before production.
        </footer>
      </article>
    </div>
  );
}
