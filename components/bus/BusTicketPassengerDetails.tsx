'use client';

import { useSyncExternalStore } from 'react';

interface PassengerDraft {
  contact?: { email?: string; phone?: string };
  travelers?: Array<{ age?: number; firstName?: string; lastName?: string }>;
}

interface StoredBusBooking {
  confirmationCode?: string;
  passengerDraft?: PassengerDraft;
}

interface BusTicketPassengerDetailsProps {
  confirmationCode: string;
}

const subscribe = () => () => undefined;
const getSnapshot = () => sessionStorage.getItem('mandyal-bus-booking');
const getServerSnapshot = () => null;

export function BusTicketPassengerDetails({ confirmationCode }: BusTicketPassengerDetailsProps) {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  let draft: PassengerDraft | undefined;
  try {
    const booking = stored ? (JSON.parse(stored) as StoredBusBooking) : undefined;
    draft = booking?.confirmationCode === confirmationCode ? booking.passengerDraft : undefined;
  } catch {
    draft = undefined;
  }

  return (
    <section className="booking-document__section">
      <h2>Passenger and contact</h2>
      {draft?.travelers?.length ? (
        <dl className="booking-document__grid">
          {draft.travelers.map((traveler, index) => (
            <div key={`${traveler.firstName}-${index}`}>
              <dt>Passenger {index + 1}</dt>
              <dd>
                {traveler.firstName} {traveler.lastName}
                {traveler.age ? ` · Age ${traveler.age}` : ''}
              </dd>
            </div>
          ))}
          <div>
            <dt>Email</dt>
            <dd>{draft.contact?.email ?? 'Not available'}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{draft.contact?.phone ?? 'Not available'}</dd>
          </div>
        </dl>
      ) : (
        <p>Passenger details are available only in the browser used to complete this booking.</p>
      )}
    </section>
  );
}
