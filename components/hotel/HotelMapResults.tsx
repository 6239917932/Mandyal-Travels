import type { HotelSearchResult } from '@/types/hotel';

export function HotelMapResults({ results }: { results: HotelSearchResult[] }) {
  if (results.length === 0) return null;
  const first = results[0].hotel.location;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${first.longitude - 0.08}%2C${first.latitude - 0.05}%2C${first.longitude + 0.08}%2C${first.latitude + 0.05}&layer=mapnik&marker=${first.latitude}%2C${first.longitude}`;
  return (
    <section className="hotel-map-results" aria-labelledby="hotel-map-heading">
      <div>
        <p className="hotel-page__eyebrow">Map view</p>
        <h2 id="hotel-map-heading">Stays by location</h2>
        <p>
          The map opens around the first result. Every listing link uses its verified supplier
          coordinates.
        </p>
        <ol>
          {results.map((result) => (
            <li key={result.hotel.id}>
              <a
                href={`https://www.openstreetmap.org/?mlat=${result.hotel.location.latitude}&mlon=${result.hotel.location.longitude}#map=15/${result.hotel.location.latitude}/${result.hotel.location.longitude}`}
                rel="noreferrer"
                target="_blank"
              >
                <strong>{result.hotel.name}</strong> —{' '}
                {result.hotel.location.address.locality ?? result.hotel.location.address.city}
                {result.distanceKm !== undefined
                  ? ` · ${result.distanceKm.toFixed(1)} km away`
                  : ''}
              </a>
            </li>
          ))}
        </ol>
      </div>
      <iframe loading="lazy" referrerPolicy="no-referrer" src={mapUrl} title="Hotel search map" />
    </section>
  );
}
