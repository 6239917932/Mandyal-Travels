'use client';

import Link from 'next/link';
import { useState } from 'react';

interface StoredBooking {
  confirmationCode: string;
  passengerDraft?: {
    contact: { email: string; phone: string };
    passengers: Array<{ firstName: string; lastName: string }>;
  };
}

interface FlightConfirmationDetailsProps {
  confirmationCode: string;
  itineraryQuery: Record<string, string>;
}

export function FlightConfirmationDetails({
  confirmationCode,
  itineraryQuery,
}: FlightConfirmationDetailsProps) {
  const [booking] = useState<StoredBooking | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    const value = sessionStorage.getItem('mandyal-flight-booking');
    if (!value) return undefined;
    try {
      return JSON.parse(value) as StoredBooking;
    } catch {
      return undefined;
    }
  });
  const passenger = booking?.passengerDraft?.passengers[0];
  const email = booking?.passengerDraft?.contact.email;

  return (
    <>
      <p className="flight-confirmation-page__message">
        {email
          ? `A confirmation summary has been prepared for ${email}.`
          : 'Your confirmation summary is ready.'}
      </p>
      <dl className="flight-confirmation-page__customer">
        <div>
          <dt>Lead passenger</dt>
          <dd>{passenger ? `${passenger.firstName} ${passenger.lastName}` : 'Traveler'}</dd>
        </div>
        <div>
          <dt>Payment status</dt>
          <dd>Captured</dd>
        </div>
      </dl>
      <div className="flight-confirmation-page__actions">
        <Link
          className="ui-button ui-button--primary"
          href={{
            pathname: `/flights/booking/${confirmationCode}/itinerary`,
            query: itineraryQuery,
          }}
        >
          View itinerary
        </Link>
        <Link className="ui-button ui-button--secondary" href="/flights">
          Book another flight
        </Link>
      </div>
    </>
  );
}
