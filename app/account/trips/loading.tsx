import { Card } from '@/components/ui/Card';

export default function CustomerTravelHistoryLoading() {
  return (
    <section aria-busy="true" aria-label="Loading travel history" className="account-page">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Your journeys</p>
          <h1>Loading travel history</h1>
        </div>
      </div>
      <div className="account-trips__list" aria-hidden="true">
        <Card className="account-trip">Checking your transport and rental bookings…</Card>
        <Card className="account-trip">Checking your hotel bookings…</Card>
      </div>
    </section>
  );
}
