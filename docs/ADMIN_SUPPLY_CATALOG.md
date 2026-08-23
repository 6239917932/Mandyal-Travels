# Administrator supply catalog

`/admin/catalog` is a platform-administrator-only, read-only directory for hotel supply content. It
combines bounded property/supplier search with closed source, approval, publication, and content
readiness filters. Broad queries above 1,000 property records fail safely and ask the administrator
to narrow the filters instead of loading an unbounded catalogue.

The internal inventory source distinguishes Mandyal PMS/local inventory from external API supplier
inventory. This provenance is intentionally visible only inside protected administrator and partner
records; customer search and hotel detail pages do not expose it.

Content readiness is deterministic review guidance, not automatic approval. It checks description,
location hierarchy, map coordinates, media, amenities, policies, active room types, and active rate
plans. Approval and publication remain separate human-controlled workflows in supplier governance.
The directory cannot edit supplier content, publish properties, change rates or inventory, contact a
provider, or modify payments and refunds.
