import type { Metadata } from 'next';

import { TripPlanner } from '@/components/ai/TripPlanner';
import { FeatureUnavailable } from '@/components/common/FeatureUnavailable';
import { isPlatformFeatureEnabled } from '@/services/platformFeatureFlagService';

export const metadata: Metadata = { title: 'AI-ready trip planner' };

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
    <div className="trip-planner-page">
      <header className="trip-planner-page__hero">
        <p className="hotel-page__eyebrow">Explainable guided planning</p>
        <h1>Build a trip around what matters to you.</h1>
        <p>
          Create an editable itinerary, then verify real availability and final prices in each live
          product search.
        </p>
      </header>
      <TripPlanner />
    </div>
  );
}
