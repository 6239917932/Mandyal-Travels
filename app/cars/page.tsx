import { MarketplaceComingSoon } from '@/components/common/MarketplaceComingSoon';
import { createPublicMetadata } from '@/lib/seo/siteMetadata';

export const metadata = createPublicMetadata({
  description: 'Car booking with Mandyal Travels is being prepared for a future verified launch.',
  path: '/cars',
  title: 'Cars — Coming Soon',
});

export default function CarsPage() {
  return <MarketplaceComingSoon product="Cars" />;
}
