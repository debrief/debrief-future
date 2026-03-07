---
feature: 130-map-spatial-filtering
type: linkedin-shipped
date: 2026-03-07
---

Just shipped live spatial filtering for the Debrief Discovery UI map view.

Analysts can now pan and zoom the map to browse exercises by geography — the timeline updates in real time to show only exercises overlapping the current viewport. Items without spatial data stay visible regardless.

Key technical decisions:
- AABB overlap with antimeridian handling (critical for maritime ops in the Pacific)
- Zero new runtime dependencies — pure TypeScript spatial utilities
- Debounced viewport callbacks (150ms) balance responsiveness with performance
- 35 unit tests covering intersection, filtering, empty states, and colour mapping

Part of the E08 STAC Browser Discovery UI epic. Next up: three-view synchronisation (#132) and the colour scheme engine (#134).

#maritime #typescript #react #leaflet #geospatial #softwareengineering
