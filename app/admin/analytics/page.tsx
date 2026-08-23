import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Platform analytics' };
export default async function AdminAnalyticsPage() {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/analytics');
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 30);
  const [events, trips, hotelBookings, value] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      _count: { _all: true },
      by: ['productType', 'funnelStage'],
      orderBy: { _count: { productType: 'desc' } },
      where: { occurredAt: { gte: since } },
    }),
    prisma.customerTrip.groupBy({
      _count: { _all: true },
      _sum: { totalAmount: true },
      by: ['productType'],
      where: { createdAt: { gte: since } },
    }),
    prisma.booking.count({ where: { createdAt: { gte: since } } }),
    prisma.booking.aggregate({
      _sum: { totalAmount: true },
      where: { createdAt: { gte: since }, currency: 'INR', status: 'confirmed' },
    }),
  ]);
  return (
    <section className="account-page admin-workspace">
      <header className="admin-hero">
        <div>
          <p className="hotel-page__eyebrow">Privacy-minimized operations intelligence</p>
          <h1>Platform analytics</h1>
          <p>
            Thirty-day product funnels and confirmed commerce totals without arbitrary client
            payloads.
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/admin">
          Operations console
        </Link>
      </header>
      <div className="partner-bookings__summary">
        <Card>
          <span>Hotel bookings</span>
          <strong>{hotelBookings}</strong>
        </Card>
        <Card>
          <span>Hotel value</span>
          <strong>₹{(value._sum.totalAmount ?? 0).toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Other product trips</span>
          <strong>{trips.reduce((total, row) => total + row._count._all, 0)}</strong>
        </Card>
        <Card>
          <span>Tracked funnel events</span>
          <strong>{events.reduce((total, row) => total + row._count._all, 0)}</strong>
        </Card>
      </div>
      <section>
        <h2>Product commerce</h2>
        <div className="supplier-admin__grid">
          {trips.map((row) => (
            <Card key={row.productType}>
              <strong>{row.productType}</strong>
              <p>
                {row._count._all} trips · ₹{(row._sum.totalAmount ?? 0).toLocaleString('en-IN')}
              </p>
            </Card>
          ))}
        </div>
      </section>
      <section>
        <h2>Consent-aware account funnel</h2>
        <div className="supplier-admin__grid">
          {events.map((row) => (
            <Card key={`${row.productType}-${row.funnelStage}`}>
              <strong>
                {row.productType} · {row.funnelStage.replaceAll('_', ' ')}
              </strong>
              <p>{row._count._all} events</p>
            </Card>
          ))}
          {events.length === 0 ? (
            <Card>No account funnel events recorded in this period.</Card>
          ) : null}
        </div>
      </section>
    </section>
  );
}
