The gap between a drawing library firing an event and a schema-valid feature appearing in your dataset is smaller than you'd think -- if you keep the conversion pure.

Feature 094 in Future Debrief adds point and rectangle drawing to the tactical map. The interesting part isn't the drawing itself (Geoman handles that); it's the `createDrawnFeature()` factory that sits between raw GeoJSON output and the data model. One pure function: takes Geoman's output, returns a schema-compliant ReferenceLocation or RectangleAnnotation with a UUID, default styling, and validated geometry. No side effects, no DOM, fully testable without a map instance.

We reuse existing LinkML-generated types rather than inventing new "drawn shape" classes. A point drawn by an analyst and a point parsed from a REP file are the same type in the schema -- they just arrived differently. Zero-area rectangles (accidental click without drag) return null and are silently discarded.

Three new modules, ~200 lines of TypeScript, no new dependencies.

https://debrief.github.io/blog/2026/02/13/planning-point-rectangle-drawing

#FutureDebrief #MaritimeAnalysis #GeoJSON
