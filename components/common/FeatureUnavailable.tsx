import Link from 'next/link';

import { Card } from '@/components/ui/Card';

export function FeatureUnavailable({ description, title }: { description: string; title: string }) {
  return (
    <section className="account-page">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Temporarily unavailable</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/">
          Return home
        </Link>
      </div>
      <Card>
        <strong>No existing booking or account access is affected.</strong>
        <p>Please try again later or contact Mandyal Travels support if you need assistance.</p>
      </Card>
    </section>
  );
}
