# Search, cache, and analytics projections

The relational database remains the source of truth. `SearchProjectionDocument` is a disposable, rebuildable read model containing normalized terms, bounded facets, a public payload, and a source hash. Administrators inspect projection coverage through `/admin/search`. A rebuild requires an exact confirmation phrase and a bounded operational reason; every successful rebuild records an append-only `SearchProjectionRebuildEvent` in the administrator operations audit. Rebuilds never change rates, availability, inventory, bookings, supplier records, or payments. Provider indexing workers may consume the same rows without reading private supplier or guest tables.

Production search may use OpenSearch, Elasticsearch, Algolia, or another approved engine only after residency, deletion, cost, and operational review. Redis-compatible caching may store public search responses and short-lived rate-limit state. Cache keys use the `mandyal:v1` namespace and hashed normalized inputs; no guest identity, email, phone, raw query token, or payment data belongs in a key or cached payload.

Projection writes are idempotent, source-versioned, and rebuilt transactionally. Every rebuild uses
the complete governed destination vocabulary, parses aliases and amenities independently, and removes
hotel documents whose source property is no longer active and published. A malformed optional metadata
field cannot discard another valid field or introduce non-string facets. Search and cache outages must
fall back to bounded relational queries rather than corrupt inventory or prices. Availability and final
quotes always come from the live inventory/quote engines, never from search documents. Analytics events
remain purpose-limited and are projected separately from operational data.
