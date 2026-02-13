Our GeoJSON styling schemas have described MultiPoint and MultiPolygon support since day one. PointProperties says "for Point and MultiPoint geometries." PolygonProperties says "for Polygon and MultiPolygon geometries." But the geometry classes themselves never existed -- until now.

We're adding GeoJSONMultiPoint and GeoJSONMultiPolygon to Debrief's LinkML master schema, following the exact same pattern we used for MultiLineString in compound tracks. Two new geometry classes, two new Feature types, two new enum values. Zero new dependencies, zero changes to existing schemas.

This unblocks tools currently in development that return point clusters and polygonal regions as validated, styled GeoJSON Features. Each result carries provenance -- which tool created it, which features it was derived from.

Sometimes the schema was ready before the code caught up.

[Read the full planning post](https://debrief.github.io/future/2026/02/13/planning-multipoint-and-multipolygon-feature-schemas.html)

#FutureDebrief #MaritimeAnalysis #OpenSource
