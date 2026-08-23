import Link from 'next/link';

import { Card } from '@/components/ui/Card';

export default async function PartnerUnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ required?: string }>;
}) {
  const required = (await searchParams).required ?? 'different';
  return (
    <section className="account-page">
      <Card>
        <p className="hotel-page__eyebrow">Permission required</p>
        <h1>This tool belongs to a {required} supplier workspace.</h1>
        <p>
          Your supplier account remains signed in, but it cannot open another supplier type&apos;s
          operational tools.
        </p>
        <Link className="ui-button ui-button--primary" href="/partner">
          Return to my supplier workspace
        </Link>
      </Card>
    </section>
  );
}
