import { Card } from '@/components/ui/Card';

export default function CustomerPaymentsLoading() {
  return (
    <section aria-busy="true" aria-label="Loading hotel payment activity" className="account-page">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Hotel payments</p>
          <h1>Loading payment and refund activity…</h1>
        </div>
      </div>
      <div className="customer-payments__list">
        <Card className="customer-payments__loading">
          <span />
          <span />
          <span />
        </Card>
        <Card className="customer-payments__loading">
          <span />
          <span />
          <span />
        </Card>
      </div>
    </section>
  );
}
