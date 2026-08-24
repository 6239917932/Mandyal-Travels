# Hotel results location explorer

The hotel results page includes a credential-free relative location overview built only from the
validated latitude and longitude already present in each normalized hotel result.

- Markers and the numbered hotel list are keyboard operable and keep the selected result card in
  sync.
- Invalid, non-finite, out-of-range, and placeholder `0,0` coordinates are omitted. A hotel remains
  available in the semantic results list even when it cannot be plotted.
- The overview is explicitly not a navigation, routing, distance, or geocoding map. It does not call
  a map provider, infer missing coordinates, or expose inventory provenance.
- Pagination and every existing search parameter remain owned by the server-rendered results page.
- The individual hotel detail page remains the authoritative property-location view.
