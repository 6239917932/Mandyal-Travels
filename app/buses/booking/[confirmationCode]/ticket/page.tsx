import Link from 'next/link';
import type { Metadata } from 'next';

import { PrintDocumentButton } from '@/components/booking/PrintDocumentButton';
import { BusTicketPassengerDetails } from '@/components/bus/BusTicketPassengerDetails';
import { busService } from '@/services/busService';
import { createBusSearchCriteria } from '@/utils/busSearchCriteria';

export const metadata: Metadata = { title: 'Bus ticket' };
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const money = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
const dateTime = (value: string) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export default async function BusTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ confirmationCode: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { confirmationCode } = await params;
  const query = await searchParams;
  const criteria = createBusSearchCriteria(query);
  const offerId = first(query.offerId);
  const seats = (first(query.seats) ?? '').split(',').filter(Boolean);
  const offer = offerId ? await busService.revalidateOffer(offerId, criteria) : undefined;
  if (!offer)
    return (
      <main className="booking-document-page">
        <h1>Ticket unavailable</h1>
      </main>
    );

  return (
    <main className="booking-document-page">
      <div className="booking-document-actions">
        <Link href="/buses">← Back to buses</Link>
        <PrintDocumentButton label="Print ticket" />
      </div>
      <article className="booking-document">
        <header className="booking-document__header">
          <div>
            <div className="booking-document__brand">Mandyal Travels</div>
            <h1>Bus booking ticket</h1>
          </div>
          <div className="booking-document__status">
            <span>Booking status</span>
            <strong>CONFIRMED</strong>
          </div>
        </header>
        <div className="booking-document__reference">
          <span>Booking reference</span>
          <strong>{confirmationCode}</strong>
        </div>
        <section className="booking-document__section">
          <h2>Journey details</h2>
          <dl className="booking-document__grid">
            <div>
              <dt>Operator</dt>
              <dd>{offer.operatorName}</dd>
            </div>
            <div>
              <dt>Bus</dt>
              <dd>{offer.busType}</dd>
            </div>
            <div>
              <dt>Route</dt>
              <dd>
                {criteria.origin} → {criteria.destination}
              </dd>
            </div>
            <div>
              <dt>Travel date</dt>
              <dd>{criteria.travelDate}</dd>
            </div>
            <div>
              <dt>Departure</dt>
              <dd>{dateTime(offer.departureAt)}</dd>
            </div>
            <div>
              <dt>Arrival</dt>
              <dd>{dateTime(offer.arrivalAt)}</dd>
            </div>
            <div>
              <dt>Boarding point</dt>
              <dd>{offer.boardingPoint}</dd>
            </div>
            <div>
              <dt>Dropping point</dt>
              <dd>{offer.droppingPoint}</dd>
            </div>
            <div>
              <dt>Seat(s)</dt>
              <dd>{seats.join(', ')}</dd>
            </div>
            <div>
              <dt>Passengers</dt>
              <dd>{criteria.passengers}</dd>
            </div>
          </dl>
        </section>
        <BusTicketPassengerDetails confirmationCode={confirmationCode} />
        <div className="booking-document__total">
          <span>Amount paid</span>
          <strong>{money(offer.totalPrice)}</strong>
        </div>
        <footer className="booking-document__footer">
          Please arrive at the boarding point at least 20 minutes before departure and carry valid
          government-issued identification. This is a prototype ticket; production fulfillment will
          connect to the bus supplier.
        </footer>
      </article>
    </main>
  );
}
