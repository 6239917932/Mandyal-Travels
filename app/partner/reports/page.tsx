import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Hotel performance reports' };

type PartnerReportsPageProps = {
  searchParams: Promise<{ from?: string | string[]; through?: string | string[] }>;
};

const DAY_MS = 86_400_000;
const MAX_REPORT_ROWS = 50_000;

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function startOfMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function money(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default async function PartnerReportsPage({ searchParams }: PartnerReportsPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/partner/reports');
  const access = await getPartnerAccess();
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') redirect('/partner');

  const values = await searchParams;
  const requestedFrom = firstValue(values.from);
  const requestedThrough = firstValue(values.through);
  const from = validDate(requestedFrom) ? requestedFrom : startOfMonth();
  const through = validDate(requestedThrough) ? requestedThrough : today();
  const rangeDays = Math.floor((Date.parse(`${through}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;
  const validRange = rangeDays >= 1 && rangeDays <= 366;
  const hotelSlugs = access.allowedHotelSlugs ?? [];
  const bookingWhere = {
    hotelSlug: { in: hotelSlugs },
    quote: { checkInDate: { gte: from, lte: through } },
  };
  const matchingCount = validRange && hotelSlugs.length
    ? await prisma.booking.count({ where: bookingWhere })
    : 0;
  const isBounded = matchingCount <= MAX_REPORT_ROWS;
  const bookings = validRange && isBounded && matchingCount
    ? await prisma.booking.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          hotelSlug: true,
          operationalStatus: true,
          payment: { select: { amount: true, status: true } },
          quote: { select: { nights: true, rooms: true } },
          status: true,
          totalAmount: true,
        },
        where: bookingWhere,
      })
    : [];

  const confirmed = bookings.filter((booking) => booking.status === 'confirmed');
  const captured = confirmed.filter((booking) => booking.payment?.status === 'captured');
  const capturedValue = captured.reduce((total, booking) => total + (booking.payment?.amount ?? 0), 0);
  const roomNights = confirmed.reduce((total, booking) => total + booking.quote.nights * booking.quote.rooms, 0);
  const cancelled = bookings.filter((booking) => booking.status === 'cancelled').length;
  const noShows = bookings.filter((booking) => booking.operationalStatus === 'NO_SHOW').length;
  const checkedOut = bookings.filter((booking) => booking.operationalStatus === 'CHECKED_OUT').length;
  const propertyRows = hotelSlugs.map((hotelSlug) => {
    const propertyBookings = bookings.filter((booking) => booking.hotelSlug === hotelSlug);
    const propertyConfirmed = propertyBookings.filter((booking) => booking.status === 'confirmed');
    const propertyRoomNights = propertyConfirmed.reduce((total, booking) => total + booking.quote.nights * booking.quote.rooms, 0);
    const propertyValue = propertyConfirmed
      .filter((booking) => booking.payment?.status === 'captured')
      .reduce((total, booking) => total + (booking.payment?.amount ?? 0), 0);
    return { bookings: propertyBookings.length, hotelSlug, propertyRoomNights, propertyValue };
  }).filter((row) => row.bookings > 0);

  return (
    <section className="account-page partner-workspace">
      <div className="account-page__container">
        <header className="account-trips__heading">
          <p className="hotel-page__eyebrow">Hotel performance</p>
          <h1>Supplier reports</h1>
          <p>Review arrival-based booking performance across only your assigned properties.</p>
          <Link className="ui-button ui-button--secondary" href="/partner">Back to workspace</Link>
        </header>

        <Card>
          <form className="supplier-form__grid" method="get">
            <label className="ui-field"><span className="ui-field__label">Arrival from</span><input className="ui-input" defaultValue={from} name="from" required type="date" /></label>
            <label className="ui-field"><span className="ui-field__label">Arrival through</span><input className="ui-input" defaultValue={through} min={from} name="through" required type="date" /></label>
            <button className="ui-button ui-button--primary" type="submit">Run report</button>
          </form>
          {!validRange ? <p className="booking-page__payment-error" role="alert">Choose a valid reporting period of no more than 366 days.</p> : null}
          {!isBounded ? <p className="booking-page__payment-error" role="alert">This period contains more than {MAX_REPORT_ROWS.toLocaleString('en-IN')} bookings. Choose a shorter period for an exact report.</p> : null}
        </Card>

        {validRange && isBounded ? (
          <>
            <div className="partner-inventory__metrics">
              <Card><span>Bookings</span><strong>{matchingCount.toLocaleString('en-IN')}</strong></Card>
              <Card><span>Captured value</span><strong>{money(capturedValue)}</strong></Card>
              <Card><span>Room nights</span><strong>{roomNights.toLocaleString('en-IN')}</strong></Card>
              <Card><span>Average booking value</span><strong>{money(captured.length ? capturedValue / captured.length : 0)}</strong></Card>
              <Card><span>Cancelled</span><strong>{cancelled.toLocaleString('en-IN')}</strong></Card>
              <Card><span>No-show / checked out</span><strong>{noShows} / {checkedOut}</strong></Card>
            </div>
            <Card>
              <h2>Property performance</h2>
              <div className="partner-workspace__audit">
                {propertyRows.map((row) => (
                  <div key={row.hotelSlug}>
                    <strong>{row.hotelSlug}</strong>
                    <span>{row.bookings} bookings · {row.propertyRoomNights} room nights · {money(row.propertyValue)} captured</span>
                  </div>
                ))}
                {propertyRows.length === 0 ? <p>No bookings arrived during this period.</p> : null}
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </section>
  );
}
