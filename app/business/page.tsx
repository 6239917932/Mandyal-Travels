import Link from 'next/link';

import { PublicPageHero } from '@/components/layout/PublicPageHero';
import { Card } from '@/components/ui/Card';
import { createPublicMetadata } from '@/lib/seo/siteMetadata';

export const metadata = createPublicMetadata({
  description:
    'Mandyal Travels business travel tools for travel agencies, corporate teams, policies, booking records and support.',
  path: '/business',
  title: 'Business Travel Management',
});

const businessOptions = [
  {
    title: 'B2B travel agents',
    description:
      'Manage customer travel, negotiated pricing, commissions, booking controls, statements, and service requests from one account.',
  },
  {
    title: 'Corporate travel',
    description:
      'Organize employees and travellers, apply travel policies, support approvals, and keep invoices and reports together.',
  },
] as const;

export default function BusinessTravelPage() {
  return (
    <div className="home-page">
      <PublicPageHero
        actions={
          <>
            <Link
              className="home-link-button home-link-button--primary"
              href="/register?account=agent"
            >
              Create a travel agency account
            </Link>
            <Link
              className="home-link-button home-link-button--primary"
              href="/register?account=business"
            >
              Create a business account
            </Link>
            <Link
              className="home-link-button home-link-button--glass"
              href="/login?portal=corporate"
            >
              Corporate sign in
            </Link>
          </>
        }
        description="One connected platform for travel agents, corporate teams, travellers, bookings, policies, invoices, and support."
        eyebrow="Mandyal Travels for Business"
        size="large"
        title="Travel management built around your organization."
      />

      <section className="home-section">
        <div className="home-container">
          <div className="home-section__heading">
            <p className="home-section__eyebrow">Choose your business channel</p>
            <h2 className="home-section__title">
              Shared travel engines, organization-aware controls.
            </h2>
          </div>
          <div className="travel-options-grid">
            {businessOptions.map((option, index) => (
              <Card className="travel-option" key={option.title}>
                <span className="travel-option__number">0{index + 1}</span>
                <h3>{option.title}</h3>
                <p>{option.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
