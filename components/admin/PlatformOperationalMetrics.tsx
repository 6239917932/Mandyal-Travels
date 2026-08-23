import { Card } from '@/components/ui/Card';
import {
  formatAnalyticsPercent,
  type OperationalAnalyticsSnapshot,
} from '@/services/platformAnalyticsService';

export function PlatformOperationalMetrics({
  snapshot,
}: {
  snapshot: OperationalAnalyticsSnapshot;
}) {
  return (
    <section>
      <div className="account-trips__heading">
        <p className="hotel-page__eyebrow">Current operating posture</p>
        <h2>Conversion, service, supply, and risk</h2>
        <p>
          Funnel and commerce ratios cover the last 30 days. Funnel ratios include only
          consent-aware signed-in events; support, supply, and risk show current governed records.
        </p>
      </div>
      <div className="partner-bookings__summary">
        <Card>
          <span>Tracked search-to-confirmation</span>
          <strong>{formatAnalyticsPercent(snapshot.trackedConversionPercent)}</strong>
          <small>
            {snapshot.confirmedFunnelEvents} confirmations / {snapshot.searchFunnelEvents} searches
          </small>
        </Card>
        <Card>
          <span>Hotel cancellation rate</span>
          <strong>{formatAnalyticsPercent(snapshot.hotelCancellationPercent)}</strong>
          <small>
            {snapshot.hotelCancellations} cancelled / {snapshot.hotelBookings} created
          </small>
        </Card>
        <Card>
          <span>Checkout capture completion</span>
          <strong>{formatAnalyticsPercent(snapshot.capturedCheckoutPercent)}</strong>
          <small>
            {snapshot.capturedCheckoutIntents} captured / {snapshot.totalCheckoutIntents} initiated
          </small>
        </Card>
        <Card>
          <span>Active supplier accounts</span>
          <strong>{formatAnalyticsPercent(snapshot.activeSupplierPercent)}</strong>
          <small>
            {snapshot.activeSuppliers} active / {snapshot.totalSuppliers} total
          </small>
        </Card>
        <Card>
          <span>Published approved hotels</span>
          <strong>{formatAnalyticsPercent(snapshot.publishedHotelPercent)}</strong>
          <small>
            {snapshot.publishedHotelProperties} ready / {snapshot.totalHotelProperties} total
          </small>
        </Card>
        <Card>
          <span>Open support load</span>
          <strong>{snapshot.openSupportCases}</strong>
          <small>
            {snapshot.openCustomerSupportCases} customer + {snapshot.openBusinessSupportCases}{' '}
            business
          </small>
        </Card>
        <Card>
          <span>Open high-severity risk</span>
          <strong>{snapshot.highRiskSignals}</strong>
          <small>High or critical signals awaiting resolution</small>
        </Card>
      </div>
    </section>
  );
}
