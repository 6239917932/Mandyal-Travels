import { TripPlanner } from '@/components/ai/TripPlanner';
import { FeatureUnavailable } from '@/components/common/FeatureUnavailable';
import { PublicPageHero } from '@/components/layout/PublicPageHero';
import { isPlatformFeatureEnabled } from '@/services/platformFeatureFlagService';
import { createPublicMetadata } from '@/lib/seo/siteMetadata';

export const metadata = createPublicMetadata({
  description:
    'Create an editable Himachal Pradesh trip plan, then verify live availability and prices for each travel service.',
  path: '/trip-planner',
  title: 'Himachal Pradesh Trip Planner',
});

export default async function TripPlannerPage() {
  if (!(await isPlatformFeatureEnabled('AI_TRIP_PLANNER'))) {
    return (
      <FeatureUnavailable
        description="Guided trip planning is paused while Mandyal Travels reviews the service."
        title="Trip planning is paused"
      />
    );
  }
  return (
    <div>
      <PublicPageHero
        description="Create an editable hotel-stay plan, then confirm real room availability and the final price in hotel search."
        eyebrow="Hotel-first guided planning"
        imageAlt="Travellers planning a Himalayan hotel stay beside a mountain view"
        imageSrc="/marketing/trip-planner-hero-v1.png"
        title="Plan a stay around what matters to you."
      />
      <div className="trip-planner-page">
        <TripPlanner />
      </div>
    </div>
  );
}
