# Maps and geocoding activation

Hotel discovery already supports structured locality, district, town/city, tehsil, aliases, latitude/longitude, landmarks, and radius search. A live geocoder must return normalized candidates for supplier confirmation rather than silently overwriting an address.

Production activation requires an approved maps provider and billing account, server/browser key separation, origin/IP restrictions, usage quotas, caching and attribution compliance, locality-quality tests for Indian rural and hill destinations, supplier confirmation, privacy review, and graceful fallback when geocoding is unavailable.
