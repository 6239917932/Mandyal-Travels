import { Card } from '@/components/ui/Card';

export default function CustomerBenefitsLoading() {
  return (
    <section className="account-page" aria-busy="true" aria-live="polite">
      <div className="account-trips__heading">
        <p className="hotel-page__eyebrow">Customer programme readiness</p>
        <h1>Loading your benefits record…</h1>
      </div>
      <Card className="account-trips__empty">
        <p>Your read-only, account-scoped record is being prepared.</p>
      </Card>
    </section>
  );
}
