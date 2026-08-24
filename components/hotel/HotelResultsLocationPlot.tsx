'use client';

import type { CSSProperties } from 'react';

import type { HotelResultsLocationMarker } from '@/utils/hotelResultsLocation';

interface HotelResultsLocationPlotProps {
  markers: HotelResultsLocationMarker[];
  onSelect: (hotelId: string) => void;
  selectedHotelId: string | null;
}

function markerStyle(marker: HotelResultsLocationMarker): CSSProperties {
  return {
    left: `${marker.xPercent}%`,
    top: `${marker.yPercent}%`,
  };
}

export function HotelResultsLocationPlot({
  markers,
  onSelect,
  selectedHotelId,
}: HotelResultsLocationPlotProps) {
  return (
    <aside className="hotel-results-location" aria-labelledby="hotel-results-location-heading">
      <div className="hotel-results-location__heading">
        <div>
          <p className="hotel-page__eyebrow">Location overview</p>
          <h2 id="hotel-results-location-heading">Compare where these stays are</h2>
        </div>
        <p>Relative positions from verified property coordinates—not a navigation map.</p>
      </div>

      <div
        className="hotel-results-location__plot"
        role="group"
        aria-label={`Relative location plot for ${markers.length} available ${markers.length === 1 ? 'hotel' : 'hotels'}`}
      >
        <span aria-hidden="true" className="hotel-results-location__north">
          N
        </span>
        {markers.map((marker, index) => (
          <button
            aria-label={`Show ${marker.label} in the results list`}
            aria-pressed={selectedHotelId === marker.hotelId}
            className="hotel-results-location__marker"
            key={marker.hotelId}
            onClick={() => onSelect(marker.hotelId)}
            style={markerStyle(marker)}
            type="button"
          >
            {index + 1}
          </button>
        ))}
      </div>

      <ol className="hotel-results-location__list" aria-label="Hotels shown in location overview">
        {markers.map((marker, index) => (
          <li key={marker.hotelId}>
            <button
              aria-current={selectedHotelId === marker.hotelId ? 'true' : undefined}
              onClick={() => onSelect(marker.hotelId)}
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
