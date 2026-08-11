import type { Metadata } from 'next';
import Link from 'next/link';

import { Card } from '@/components/ui/Card';

export const metadata: Metadata = { title: 'Business travel' };

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
      <section className="home-hero">
        <div className="home-container">
          <p className="home-hero__eyebrow">Mandyal Travels for Business</p>
          <h1 className="home-hero__title">Travel management built around your organization.</h1>
          <p className="home-hero__description">
            One connected platform for travel agents, corporate teams, travellers, bookings,
            policies, invoices, and support.
          </p>
          <div className="home-hero__actions">
            <Link
              className="home-link-button home-link-button--primary"
              href="/register?account=business"
            >
              Create a business account
            </Link>
            <Link className="home-link-button home-link-button--secondary" href="/login">
              Sign in
            </Link>
          </div>
        </div>
      </section>

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
