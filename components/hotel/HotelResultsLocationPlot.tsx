'use client';

import type { HotelResultsLocationMarker } from '@/utils/hotelResultsLocation';

interface HotelResultsLocationPlotProps {
  markers: HotelResultsLocationMarker[];
  onSelect: (hotelKey: string) => void;
  selectedHotelKey: string | null;
}

export function HotelResultsLocationPlot({
  markers,
  onSelect,
  selectedHotelKey,
}: HotelResultsLocationPlotProps) {
  return (
    <aside className="hotel-results-location" aria-labelledby="hotel-results-location-heading">
      <div className="hotel-results-location__heading">
        <div>
          <p className="hotel-page__eyebrow">Quick navigation</p>
          <h2 id="hotel-results-location-heading">Jump to a stay</h2>
        </div>
        <p>Select a property to move directly to its verified rate and availability.</p>
      </div>

      <ol className="hotel-results-location__list" aria-label="Available hotel result shortcuts">
        {markers.map((marker, index) => (
          <li key={marker.hotelKey}>
            <button
              aria-current={selectedHotelKey === marker.hotelKey ? 'true' : undefined}
              aria-label={`Show ${marker.label} in the results list`}
              onClick={() => onSelect(marker.hotelKey)}
              type="button"
            >
              <span aria-hidden="true">{index + 1}.</span> {marker.label}
            </button>
          </li>
        ))}
      </ol>
    </aside>
  );
}
