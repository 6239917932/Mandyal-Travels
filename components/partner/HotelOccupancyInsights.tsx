import { Card } from '@/components/ui/Card';
import type { HotelOccupancyInsight } from '@/services/hotelOccupancyInsightService';

export function HotelOccupancyInsights({ insights }: { insights: HotelOccupancyInsight[] }) {
  const declaredRoomNights = insights.reduce(
    (total, insight) => total + insight.declaredRoomNights,
    0,
  );
  const occupiedRoomNights = insights.reduce(
    (total, insight) => total + insight.occupiedRoomNights,
    0,
  );
  const calendarOpenRoomNights = insights.reduce(
    (total, insight) => total + insight.sellableRoomNights,
    0,
  );
  const stopSellRoomNights = insights.reduce(
    (total, insight) => total + insight.stopSellRoomNights,
    0,
  );
  const occupancyPercent = declaredRoomNights
    ? Math.round((occupiedRoomNights / declaredRoomNights) * 1_000) / 10
    : null;

  return (
    <Card>
      <div className="account-trips__heading">
        <p className="hotel-page__eyebrow">Human-reviewed decision support</p>
        <h2>Occupancy and availability insights</h2>
        <p>
          These deterministic indicators use only your declared room capacity, calendar controls,
          and confirmed stays. They never change rates, restrictions, stop-sales, or inventory
          automatically.
        </p>
      </div>
      <div className="partner-inventory__metrics">
        <Card>
          <span>Booked occupancy</span>
          <strong>{occupancyPercent === null ? 'Not available' : `${occupancyPercent}%`}</strong>
        </Card>
        <Card>
          <span>Occupied / declared room nights</span>
          <strong>
            {occupiedRoomNights.toLocaleString('en-IN')} /{' '}
            {declaredRoomNights.toLocaleString('en-IN')}
          </strong>
        </Card>
        <Card>
          <span>Calendar-open room nights</span>
          <strong>{calendarOpenRoomNights.toLocaleString('en-IN')}</strong>
        </Card>
        <Card>
          <span>Stop-sell room nights</span>
          <strong>{stopSellRoomNights.toLocaleString('en-IN')}</strong>
        </Card>
      </div>
      <div className="partner-workspace__audit">
        {insights.map((insight) => (
          <div key={insight.hotelSlug}>
            <strong>
              {insight.propertyName} ·{' '}
              {insight.occupancyPercent === null
                ? 'occupancy unavailable'
                : `${insight.occupancyPercent}% occupancy`}
            </strong>
            <span>{insight.recommendation}</span>
          </div>
        ))}
        {!insights.length ? (
          <p>Add an active room type to calculate capacity-based occupancy.</p>
        ) : null}
      </div>
    </Card>
  );
}
