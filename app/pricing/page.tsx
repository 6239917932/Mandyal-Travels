import Link from 'next/link';

import { Card } from '@/components/ui/Card';
import { createPublicMetadata } from '@/lib/seo/siteMetadata';

export const metadata = createPublicMetadata({
  description:
    'How Mandyal Travels displays supplier prices, taxes, commission, payment processing, settlements and refunds.',
  path: '/pricing',
  title: 'How Marketplace Pricing Works',
});

export default function MarketplacePricingPage() {
  return (
    <main className="legal-page">
      <section className="legal-hero">
        <p className="legal-eyebrow">CLEAR PRICES BEFORE PAYMENT</p>
        <h1>How marketplace pricing works</h1>
        <p>
          Every booking is classified by source before money is collected. Mandyal marketplace
          bookings use an 18% all-inclusive commercial fee; direct PMS bookings and external OTA
          imports follow separate rules. Applicable government taxes are shown before payment.
        </p>
        <div className="legal-draft-notice" role="note">
          Live marketplace payments and public partner listings remain disabled until GST,
          payment-provider, contract, classification, and supplier-review controls are approved.
        </div>
      </section>

      <section className="legal-content">
        <p className="legal-eyebrow">LAUNCH COMMERCIAL SCHEDULE</p>
        <h2>One source, one disclosed rule</h2>
        <div className="legal-card-grid">
          <Card>
            <h3>Mandyal marketplace</h3>
            <p>
              18% of booking value, minimum ₹199, inclusive of GST on Mandyal&apos;s fee and
              standard gateway processing. The customer sees the total before payment.
            </p>
          </Card>
          <Card>
            <h3>PMS direct · online</h3>
            <p>
              6% of booking value, minimum ₹99, when a hotel-created direct or walk-in booking is
              paid through an enabled Mandyal payment flow.
            </p>
          </Card>
          <Card>
            <h3>PMS direct · offline</h3>
            <p>
              3% of booking value, minimum ₹49, when the hotel records cash, its own UPI, or its own
              POS. The fee remains payable to Mandyal; the PMS must record the actual payment mode.
            </p>
          </Card>
          <Card>
            <h3>External OTA import</h3>
            <p>
              0% Mandyal booking commission. The OTA&apos;s own contract and charges remain between
              the hotel and that OTA. Imported payments must never be represented as collected by
              Mandyal.
            </p>
          </Card>
        </div>
        <h2>PMS subscription</h2>
        <p>
          Months 1–6 are free. Months 7–12 are charged at 50% of the applicable room tier. From
          month 13, monthly prices are ₹1,999 for 1–10 rooms, ₹2,999 for 11–20, ₹4,499 for 21–35,
          ₹5,999 for 36–50, and ₹8,999 for 51–100, plus GST. Larger properties require a written
          quote. A standard-rate annual term beginning in month 13 or later charges the equivalent
          of 10 months. Transaction fees apply from day one.
        </p>
        <p>
          Supplier settlement becomes eligible only after successful capture, checkout,
          reconciliation, and clearance of refund, fraud, chargeback, compliance, or legal holds.
          The operating target is two business days after eligibility, not a guaranteed 48-hour
          clock.
        </p>
        <p>
          <strong>No hidden payment surcharge:</strong> standard gateway processing is included in
          the commercial commission. A clearly identified exceptional fee can be charged only when
          it is legally permitted and disclosed before the customer confirms payment.
        </p>
        <p>
          Read the <Link href="/legal/terms">terms of use</Link>,{' '}
          <Link href="/legal/cancellation-refunds">cancellation and refund policy</Link>, and{' '}
          <Link href="/legal/partner-standards">supplier standards</Link> for the complete operating
          framework.
        </p>
      </section>
    </main>
  );
}
