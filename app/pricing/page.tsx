import type { Metadata } from 'next';
import Link from 'next/link';

import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'How marketplace pricing works',
  description:
    'How Mandyal Travels displays supplier prices, taxes, commission, payment processing, settlements, and refunds.',
};

export default function MarketplacePricingPage() {
  return (
    <main className="legal-page">
      <section className="legal-hero">
        <p className="legal-eyebrow">CLEAR PRICES BEFORE PAYMENT</p>
        <h1>How marketplace pricing works</h1>
        <p>
          Hotels and vehicle operators set their own base price. For approved marketplace listings,
          Mandyal Travels converts that base into a public price that includes its 20% commercial
          commission. Applicable government taxes are then shown separately before payment.
        </p>
        <div className="legal-draft-notice" role="note">
          Live marketplace payments and public partner listings remain disabled until GST,
          payment-provider, contract, classification, and supplier-review controls are approved.
        </div>
      </section>

      <section className="legal-content">
        <p className="legal-eyebrow">ILLUSTRATIVE HOTEL PRICE</p>
        <h2>A supplier base of ₹1,000</h2>
        <div className="legal-card-grid">
          <Card>
            <h3>Public room price</h3>
            <p>
              ₹1,250 before accommodation GST. The ₹250 difference is Mandyal Travels&apos; gross
              commission, inclusive of GST on that commission and standard payment processing.
            </p>
          </Card>
          <Card>
            <h3>Government tax</h3>
            <p>
              At an illustrative 12% hotel GST rate, ₹150 is added and the customer total is ₹1,400.
              The applicable rate is selected by the server from reviewed rules, not by the
              supplier.
            </p>
          </Card>
          <Card>
            <h3>Supplier settlement</h3>
            <p>
              The supplier&apos;s base and any GST due to a registered supplier are settled after
              the stay, less statutory GST TCS or income-tax TDS where applicable. Those deductions
              are credited to the supplier through government reporting; they are not Mandyal
              revenue.
            </p>
          </Card>
          <Card>
            <h3>Refunds</h3>
            <p>
              Refund eligibility follows the rate and supplier cancellation policy shown before
              booking. An approved refund reverses the corresponding commission, tax, and supplier
              amounts in the settlement record.
            </p>
          </Card>
        </div>
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
