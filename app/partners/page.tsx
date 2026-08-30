import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { Card } from '@/components/ui/Card';

export const metadata: Metadata = { title: 'Supply partners' };

const partnerOptions = [
  {
    title: 'Hotel owners',
    description:
      'Manage properties, rooms, rates, availability, reservations, policies, documents, reviews, and settlement visibility.',
  },
  {
    title: 'Car owners',
    description:
      'Manage fleets, vehicle availability, rental rates, operations, compliance documents, bookings, and settlements.',
  },
  {
    title: 'Bus operators',
    description:
      'Manage routes, schedules, fleets, seats, fares, bookings, manifests, cancellations, and operational reporting.',
  },
  {
    title: 'Flight suppliers',
    description:
      'Manage supplier configuration, offer and booking synchronization, exceptions, reconciliation, and commercial controls.',
  },
] as const;

export default function PartnersPage() {
  return (
    <div className="home-page">
      <section className="home-hero home-hero--interior home-hero--photo">
        <Image
          alt="Himalayan mountain ridges, a winding road, and a hillside lodge at sunrise"
          className="home-hero--photo__image"
          fill
          priority
          sizes="100vw"
          src="/home/mandyal-travel-hero-v2.png"
        />
        <div aria-hidden="true" className="home-hero--photo__shade" />
        <div className="home-container">
          <p className="home-hero__eyebrow">Mandyal Travels partner network</p>
          <h1 className="home-hero__title">Connect your travel inventory to more customers.</h1>
          <p className="home-hero__description">
            A shared partner platform for onboarding, inventory, reservations, operations,
            documents, reporting, and settlement visibility.
          </p>
          <div className="home-hero__actions">
            <Link className="home-link-button home-link-button--primary" href="/partners/apply">
              Request partner onboarding
            </Link>
            <Link className="home-link-button home-link-button--glass" href="/partner">
              Open partner operations
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-container">
          <div className="home-section__heading">
            <p className="home-section__eyebrow">Partner channels</p>
            <h2 className="home-section__title">Tools designed for every supply partner.</h2>
          </div>
          <div className="travel-options-grid">
            {partnerOptions.map((option, index) => (
              <Card className="travel-option" key={option.title}>
                <span className="travel-option__number">0{index + 1}</span>
                <h3>{option.title}</h3>
                <p>{option.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section home-section--alt">
        <div className="home-container">
          <div className="home-section__heading">
            <p className="home-section__eyebrow">Existing partners</p>
            <h2 className="home-section__title">Run day-to-day supply operations.</h2>
            <p className="home-section__description">
              Operational access is separate from customer and business accounts. Named supplier
              accounts are invite-only and restricted to properties assigned by Mandyal Travels.
            </p>
          </div>
          <div className="travel-options-grid">
            <Card className="travel-option">
              <span className="travel-option__number">01</span>
              <h3>Bookings</h3>
              <p>Monitor hotel reservations, stay dates, payment state, and room allocation.</p>
              <Link className="home-card__link" href="/partner">
                Open supplier workspace
              </Link>
            </Card>
            <Card className="travel-option">
              <span className="travel-option__number">02</span>
              <h3>Inventory</h3>
              <p>
                Review sellable rooms, active holds, confirmed allocations, and stop-sell limits.
              </p>
              <Link className="home-card__link" href="/partner">
                Open supplier workspace
              </Link>
            </Card>
            <Card className="travel-option">
              <span className="travel-option__number">03</span>
              <h3>Amendments</h3>
              <p>Review requested hotel date changes with availability and repricing checks.</p>
              <Link className="home-card__link" href="/partner">
                Open supplier workspace
              </Link>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
