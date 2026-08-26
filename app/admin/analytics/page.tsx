import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PlatformOperationalMetrics } from '@/components/admin/PlatformOperationalMetrics';
import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import {
  analyticsPercent,
  buildOperationalAnalyticsSnapshot,
  buildPartnerPerformanceRows,
  formatAnalyticsCurrency,
  formatAnalyticsPercent,
} from '@/services/platformAnalyticsService';

export const metadata: Metadata = { title: 'Platform analytics' };
export default async function AdminAnalyticsPage() {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/analytics');
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 30);
  const [
    events,
    trips,
    hotelBookings,
    hotelCancellations,
    value,
    searchFunnelEvents,
    confirmedFunnelEvents,
    totalCheckoutIntents,
    capturedCheckoutIntents,
    totalSuppliers,
    activeSuppliers,
    totalHotelProperties,
    publishedHotelProperties,
    openCustomerSupportCases,
    openBusinessSupportCases,
    highRiskSignals,
    partnerSettlementTotals,
  ] = await Promise.all([
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
    prisma.booking.count({ where: { createdAt: { gte: since }, status: 'cancelled' } }),
    prisma.booking.aggregate({
      _sum: { totalAmount: true },
      where: { createdAt: { gte: since }, currency: 'INR', status: 'confirmed' },
    }),
    prisma.analyticsEvent.count({
      where: { eventName: 'SEARCH_PERFORMED', occurredAt: { gte: since } },
    }),
    prisma.analyticsEvent.count({
      where: { eventName: 'BOOKING_CONFIRMED', occurredAt: { gte: since } },
    }),
    prisma.paymentCheckoutIntent.count({ where: { createdAt: { gte: since } } }),
    prisma.paymentCheckoutIntent.count({
      where: { createdAt: { gte: since }, status: 'CAPTURED' },
    }),
    prisma.supplyPartner.count(),
    prisma.supplyPartner.count({ where: { status: 'ACTIVE' } }),
    prisma.partnerProperty.count(),
    prisma.partnerProperty.count({
      where: {
        approvalStatus: 'APPROVED',
        publicationStatus: 'PUBLISHED',
        status: 'ACTIVE',
      },
    }),
    prisma.customerSupportCase.count({ where: { status: 'OPEN' } }),
    prisma.businessSupportCase.count({ where: { status: 'OPEN' } }),
    prisma.riskSignal.count({
      where: { severity: { in: ['HIGH', 'CRITICAL'] }, status: 'OPEN' },
    }),
    prisma.partnerSettlement.aggregate({
      _count: { _all: true },
      _sum: {
        bookingCount: true,
        commissionAmount: true,
        grossAmount: true,
        netAmount: true,
      },
      where: { createdAt: { gte: since }, currency: 'INR' },
    }),
  ]);
  const partnerSettlementGroups = await prisma.partnerSettlement.groupBy({
    _count: { _all: true },
    _sum: {
      bookingCount: true,
      commissionAmount: true,
      grossAmount: true,
      netAmount: true,
    },
    by: ['partnerId'],
    orderBy: { _sum: { grossAmount: 'desc' } },
    take: 10,
    where: { createdAt: { gte: since }, currency: 'INR' },
  });
  const partnerIds = partnerSettlementGroups.map((group) => group.partnerId);
  const partnerIdentities =
    partnerIds.length === 0
      ? []
      : await prisma.supplyPartner.findMany({
          select: { id: true, name: true, status: true, type: true },
          where: { id: { in: partnerIds } },
        });
  const partnerPerformance = buildPartnerPerformanceRows(
    partnerSettlementGroups.map((group) => ({
      bookingCount: group._sum.bookingCount,
      commissionAmount: group._sum.commissionAmount,
      grossAmount: group._sum.grossAmount,
      netAmount: group._sum.netAmount,
      partnerId: group.partnerId,
      settlementCount: group._count._all,
    })),
    partnerIdentities,
  );
  const settlementGross = partnerSettlementTotals._sum.grossAmount ?? 0;
  const settlementCommission = partnerSettlementTotals._sum.commissionAmount ?? 0;
  const operationalSnapshot = buildOperationalAnalyticsSnapshot({
    activeSuppliers,
    capturedCheckoutIntents,
    confirmedFunnelEvents,
    highRiskSignals,
    hotelBookings,
    hotelCancellations,
    openBusinessSupportCases,
    openCustomerSupportCases,
    publishedHotelProperties,
    searchFunnelEvents,
    totalCheckoutIntents,
    totalHotelProperties,
    totalSuppliers,
  });
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
      <PlatformOperationalMetrics snapshot={operationalSnapshot} />
      <section>
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Thirty-day governed settlement evidence</p>
          <h2>Partner performance and commission</h2>
          <p>
            Read-only INR settlement results rank the ten partners with the highest recorded gross
            value. They do not estimate unrecorded sales or initiate a payout.
          </p>
        </div>
        <div className="partner-bookings__summary">
          <Card>
            <span>Recorded partner gross</span>
            <strong>{formatAnalyticsCurrency(settlementGross)}</strong>
            <small>{partnerSettlementTotals._count._all} settlement records</small>
          </Card>
          <Card>
            <span>Recorded commissions</span>
            <strong>{formatAnalyticsCurrency(settlementCommission)}</strong>
            <small>
              {formatAnalyticsPercent(analyticsPercent(settlementCommission, settlementGross))} of
              gross
            </small>
          </Card>
          <Card>
            <span>Partner net value</span>
            <strong>{formatAnalyticsCurrency(partnerSettlementTotals._sum.netAmount ?? 0)}</strong>
            <small>Before any externally governed payout execution</small>
          </Card>
          <Card>
            <span>Settled booking lines</span>
            <strong>{partnerSettlementTotals._sum.bookingCount ?? 0}</strong>
            <small>Bookings represented by these settlement records</small>
          </Card>
        </div>
        <div className="supplier-admin__grid">
          {partnerPerformance.map((partner) => (
            <Card key={partner.partnerId}>
              <span>
                {partner.type} · {partner.status}
              </span>
              <strong>{partner.name}</strong>
              <p>
                {formatAnalyticsCurrency(partner.grossAmount)} gross ·{' '}
                {formatAnalyticsCurrency(partner.netAmount)} net
              </p>
              <small>
                {partner.bookingCount} bookings · {partner.settlementCount} settlements ·{' '}
                {formatAnalyticsPercent(partner.commissionPercent)} commission
              </small>
            </Card>
          ))}
          {partnerPerformance.length === 0 ? (
            <Card>No INR partner settlements were recorded during this period.</Card>
          ) : null}
        </div>
      </section>
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
