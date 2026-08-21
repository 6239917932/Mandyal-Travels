import type { HotelAddress } from '@/types/hotel';

interface HotelLocationMapProps {
  address: HotelAddress;
  hotelName: string;
  latitude: number;
  longitude: number;
}

function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function formatAddress(address: HotelAddress): string {
  const values: Array<string | undefined> = [
    address.streetAddress,
    address.locality,
    address.city,
    address.tehsil,
    address.district,
    address.state,
    address.postalCode,
    address.country,
  ];
  const parts: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const part = value?.trim();

    if (!part) {
      continue;
    }

    const key = part.toLocaleLowerCase('en-IN');

    if (!seen.has(key)) {
      seen.add(key);
      parts.push(part);
    }
  }

  return parts.join(', ');
}

export function HotelLocationMap({
  address,
  hotelName,
  latitude,
  longitude,
}: HotelLocationMapProps) {
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return null;
  }

  const latitudeSpan = 0.012;
  const longitudeSpan = 0.018;
  const mapQuery = new URLSearchParams({
    bbox: `${longitude - longitudeSpan},${latitude - latitudeSpan},${longitude + longitudeSpan},${latitude + latitudeSpan}`,
    layer: 'mapnik',
    marker: `${latitude},${longitude}`,
  });
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?${mapQuery.toString()}`;
  const largerMapUrl = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(String(latitude))}&mlon=${encodeURIComponent(String(longitude))}#map=16/${latitude}/${longitude}`;

  return (
    <section className="hotel-location-map" aria-labelledby="hotel-location-heading">
      <div className="hotel-location-map__content">
        <div>
          <p className="hotel-page__eyebrow">Property location</p>
          <h2 id="hotel-location-heading">Where you’ll stay</h2>
          <p>{formatAddress(address)}</p>
        </div>

        <a
          className="hotel-location-map__link"
          href={largerMapUrl}
          rel="noreferrer"
          target="_blank"
        >
          Open larger map
        </a>
      </div>

      <iframe
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer"
        src={embedUrl}
        title={`Map showing the location of ${hotelName}`}
      />
      <p className="hotel-location-map__note">
        The map pin uses the coordinates supplied and verified for this property.
      </p>
    </section>
  );
}
