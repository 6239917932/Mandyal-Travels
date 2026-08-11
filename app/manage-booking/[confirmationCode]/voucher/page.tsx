import Link from 'next/link';

import { BookingDocumentAccessDenied } from '@/components/booking/BookingDocumentAccessDenied';
import { PrintDocumentButton } from '@/components/booking/PrintDocumentButton';
import { getAuthorizedManagedBooking } from '@/lib/managedBooking';

interface VoucherPageProps {
  params: Promise<{ confirmationCode: string }>;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default async function VoucherPage({ params }: VoucherPageProps) {
  const { confirmationCode } = await params;
  const booking = await getAuthorizedManagedBooking(confirmationCode);

  if (!booking) {
    return <BookingDocumentAccessDenied />;
  }

  return (
    <div className="booking-document-page">
      <div className="booking-document-actions">
        <Link href="/manage-booking">Back to Manage Booking</Link>
        <PrintDocumentButton label="Print or save voucher" />
      </div>
      <article className="booking-document">
        <header className="booking-document__header">
          <div>
            <span className="booking-document__brand">Mandyal Travels</span>
            <h1>Hotel booking voucher</h1>
          </div>
          <div
            className={`booking-document__status ${
              booking.status === 'cancelled' ? 'booking-document__status--cancelled' : ''
            }`}
          >
            <span>Booking status</span>
            <strong>{booking.status.toUpperCase()}</strong>
          </div>
        </header>

        <section className="booking-document__reference">
          <span>Booking reference</span>
          <strong>{booking.confirmationCode}</strong>
        </section>

        <section className="booking-document__section">
          <h2>Stay details</h2>
          <dl className="booking-document__grid">
            <div>
              <dt>Hotel</dt>
              <dd>{booking.hotelName}</dd>
            </div>
            <div>
              <dt>Room</dt>
              <dd>{booking.roomName ?? 'Confirmed room'}</dd>
            </div>
            <div>
              <dt>Check-in</dt>
              <dd>{booking.checkInDate ?? 'See confirmation'}</dd>
            </div>
            <div>
              <dt>Check-out</dt>
              <dd>{booking.checkOutDate ?? 'See confirmation'}</dd>
            </div>
            <div>
              <dt>Rate plan</dt>
              <dd>{booking.ratePlanName ?? 'Confirmed rate'}</dd>
            </div>
            <div>
              <dt>Rooms</dt>
              <dd>{booking.rooms ?? 1}</dd>
            </div>
          </dl>
        </section>

        <section className="booking-document__section">
          <h2>Lead guest</h2>
          <p>
            {booking.guest.firstName} {booking.guest.lastName}
          </p>
          <p>{booking.guest.email}</p>
          <p>{booking.guest.phone}</p>
        </section>

        <section className="booking-document__total">
          <span>Amount paid</span>
          <strong>{formatCurrency(booking.paymentAmount, booking.currency)}</strong>
        </section>

        <footer className="booking-document__footer">
          Present this voucher with government-issued photo identification at check-in. Contact
          support@mandyaltravels.com and quote the booking reference if you need assistance.
        </footer>
      </article>
    </div>
  );
}
