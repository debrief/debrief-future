---
platform: linkedin
type: shipped
feature: 094-point-rectangle-drawing
date: 2026-02-13
---

Shipped the conversion layer that turns raw drawing events into schema-compliant GeoJSON for Future Debrief.

The challenge: mapping libraries like Leaflet Geoman emit events with their own data structures. We needed a clean translation layer that produces GeoJSON matching the same schema as data loaded from files. No special cases, no "drawn features are different from loaded features."

The solution is a pure factory function. `createDrawnFeature()` takes drawing library output and returns a complete GeoJSON Feature with proper metadata. No side effects, no global state, fully testable. When a user drops a marker or finishes drawing a rectangle, this function runs once and returns a valid Feature that slots directly into our session state.

Two shape types in this release: Point markers (green) and Rectangles (blue). Each gets a unique ID, provenance metadata tracking when and how it was created, and styling that matches our existing palette. The function handles coordinate transformations, validates the geometry type, and constructs the complete metadata envelope.

33 unit tests cover the factory logic — coordinate handling, ID generation, metadata structure, edge cases. 13 e2e tests in Playwright verify the full flow in VS Code: activate the tool, draw a shape, confirm it appears in session state with correct geometry and styling. All tests passing.

This builds on Feature 093 (drawing toolbar) and completes the foundation for Epic E05. Next steps: circle and polygon support, then persistence to STAC catalogs.

The broader context: Future Debrief is an open-source rebuild of the Debrief maritime tactical analysis platform. Schema-first architecture using LinkML, thick Python services, thin TypeScript frontends. Everything works offline by default. This feature is part of the shape drawing toolset that lets analysts annotate tactical plots during post-mission analysis.

Code: https://github.com/debrief/debrief-future

#FutureDebrief #MaritimeAnalysis #OpenSource #TypeScript #GeoJSON
