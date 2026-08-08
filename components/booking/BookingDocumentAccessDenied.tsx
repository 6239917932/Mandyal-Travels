import Link from 'next/link';

import { Card } from '@/components/ui/Card';

export function BookingDocumentAccessDenied() {
  return (
    <div className="booking-page">
      <div className="booking-page__container">
        <Card className="booking-page__empty-state">
          <p className="hotel-page__eyebrow">Secure document</p>
          <h1>Booking access required</h1>
          <p>
            Open Manage Booking in the browser used to complete the reservation, then enter your
            booking reference again.
          </p>
          <Link className="booking-page__back-link" href="/manage-booking">
            Go to Manage Booking
          </Link>
        </Card>
      </div>
    </div>
  );
}
