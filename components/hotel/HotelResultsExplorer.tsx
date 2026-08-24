'use client';

import { useState } from 'react';

import { HotelResultCard } from '@/components/hotel/HotelResultCard';
import { HotelResultsLocationPlot } from '@/components/hotel/HotelResultsLocationPlot';
import type { HotelSearchCriteria, HotelSearchResult } from '@/types/hotel';
import { createHotelResultsLocationMarkers } from '@/utils/hotelResultsLocation';

interface HotelResultsExplorerProps {
  criteria: HotelSearchCriteria;
  results: HotelSearchResult[];
}

export function HotelResultsExplorer({ criteria, results }: HotelResultsExplorerProps) {
  const markers = createHotelResultsLocationMarkers(results);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(
    markers[0]?.hotelId ?? null,
  );

  function selectHotel(hotelId: string) {
    setSelectedHotelId(hotelId);
    window.requestAnimationFrame(() => {
      document.getElementById(`hotel-result-${hotelId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }

  return (
    <div className="hotel-results-explorer">
      {markers.length > 0 ? (
        <HotelResultsLocationPlot
          markers={markers}
          onSelect={selectHotel}
          selectedHotelId={selectedHotelId}
        />
      ) : null}

      <div className="hotel-result-list" aria-label="Available hotel results">
        {results.map((result, index) => (
          <div
            className="hotel-results-explorer__card"
            data-selected={selectedHotelId === result.hotel.id ? 'true' : 'false'}
            id={`hotel-result-${result.hotel.id}`}
            key={result.hotel.id}
            onFocus={() => setSelectedHotelId(result.hotel.id)}
            onMouseEnter={() => setSelectedHotelId(result.hotel.id)}
          >
            <HotelResultCard criteria={criteria} eagerImage={index === 0} result={result} />
          </div>
        ))}
      </div>
    </div>
  );
}
