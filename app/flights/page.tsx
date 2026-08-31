import type { Metadata } from 'next';

import { MarketplaceComingSoon } from '@/components/common/MarketplaceComingSoon';

export const metadata: Metadata = {
  description: 'Mandyal Travels live flight search is coming after supplier API verification.',
  title: 'Flights coming soon',
};

export default function FlightsPage() {
  return <MarketplaceComingSoon product="Flights" />;
}
