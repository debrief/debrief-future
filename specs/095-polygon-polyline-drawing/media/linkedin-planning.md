Six files modified, zero new dependencies, and you can now draw arbitrary polygons and multi-vertex paths on the tactical map.

Feature 095 extends the `createDrawnFeature()` factory from 094 to handle polygon and polyline geometries. Same pure function approach: raw Geoman output goes in, schema-compliant GeoJSON comes out. Polygons become `PolyAnnotation` features (kind=POLY) with orange styling. Polylines become `LineAnnotation` features (kind=LINE) with teal stroke. Both validate minimum vertex counts, auto-generate UUIDs, and integrate with the existing shape palette toolbar.

The interesting bit: polylines use the existing LINE FeatureKind rather than a new POLYLINE kind. The schema already supports multi-vertex LineStrings with no upper bound -- a golden fixture with 5+ vertices proves it. Adding a new enum value would mean schema changes, type regeneration, and fixture updates for zero functional gain.

About 100 lines of TypeScript across six existing modules. The conversion layer stays pure, the shared components stay generic, the consumers own their state.

https://debrief.github.io/blog/2026/02/14/planning-polygon-polyline-drawing

#FutureDebrief #MaritimeAnalysis #GeoJSON
