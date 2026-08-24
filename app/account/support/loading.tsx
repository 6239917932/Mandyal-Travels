import { Card } from '@/components/ui/Card';

export default function CustomerSupportLoading() {
  return (
    <section aria-busy="true" aria-live="polite" className="account-page">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Help and servicing</p>
          <h1>Loading customer support</h1>
          <p>Retrieving your customer-visible cases and request form.</p>
        </div>
      </div>
      <Card>
        <p>Loading support cases…</p>
      </Card>
    </section>
  );
}
