import type { Metadata } from 'next';

import { MarketplaceComingSoon } from '@/components/common/MarketplaceComingSoon';

export const metadata: Metadata = {
  description: 'Mandyal Travels live bus search is coming after supplier API verification.',
  robots: { follow: true, index: false },
  title: 'Buses coming soon',
};

export default function BusesPage() {
  return <MarketplaceComingSoon product="Buses" />;
}
