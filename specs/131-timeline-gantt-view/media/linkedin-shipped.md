---
feature: 131-timeline-gantt-view
date: 2026-03-07
platform: linkedin
type: shipped
---

Shipped: Timeline/Gantt View for the STAC Stack Browser (E08)

The Debrief maritime analysis platform now features an interactive Gantt-style timeline for discovering exercises by their temporal characteristics.

Key capabilities:
- Horizontal bars showing each exercise's temporal extent, auto-scaling from hours to decades
- Draggable brush overlay for live temporal filtering — connected views update dynamically
- Exercise selection via double-click opens the editor while preserving filters
- Colour scheme integration with graceful error handling

Built with zero new runtime dependencies (pure SVG + React), 728 tests passing, and extracted reusable timeline utilities from the existing CatalogOverview component.

Part of Epic E08: STAC Stack Browser Discovery UI.

#maritime #debrief #typescript #react #stac #timeline #opensource
