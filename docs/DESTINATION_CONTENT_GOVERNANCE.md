# Destination content governance

The destination content workflow separates private drafts from public travel guides. Platform
administrators create and edit entries at `/admin/content`; only records explicitly marked
`PUBLISHED` appear under `/destinations` or `/destinations/[slug]`.

Every save requires the version last reviewed and a reason between 10 and 500 characters. Successful
changes increment the version and append an immutable event with the action, resulting state,
administrator, reason, and time. Concurrent stale edits fail with a conflict instead of overwriting
newer work. Entries are never deleted through the portal; an administrator returns published content
to draft when it should leave the public site.

Drafts require a stable slug, destination name, region, country, and useful summary. Publication also
requires an introduction, HTTPS or local hero image, best-time guidance, at least two highlights, and
at least two practical travel tips. Published content cannot be saved in an incomplete state.

Public guides clearly state that editorial content is not an availability, weather, transport,
safety, visa, price, or booking guarantee. Search and trip-planning calls to action continue through
the existing inventory-backed journeys. The CMS does not contact an AI, maps, media, supplier, or
payment provider, and it does not modify Cashfree.
