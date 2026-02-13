When we wrote the styling schemas for Future Debrief in January, PointProperties already said "for Point and MultiPoint geometries." The documentation anticipated the need. The geometry classes didn't exist yet.

Now they do. GeoJSONMultiPoint and GeoJSONMultiPolygon are in the LinkML master schema, with generated Pydantic, JSON Schema, and TypeScript artifacts. Tools that find intercept points between tracks or compute coverage zones can return validated, styled multi-geometry features that flow through the same pipeline as everything else.

Six new schema classes, two new FeatureKindEnum values, 10 golden fixtures (including polygons with interior holes), 146 tests passing with zero regressions. Zero new dependencies -- the styling classes were ready from the start.

Following the pattern established by GeoJSONMultiLineString for compound tracks, this was execution rather than invention. Sometimes the best schema work is wiring up what was already designed.

Read the full post: https://debrief.github.io/future/2026/02/13/shipped-multipoint-multipolygon-feature-schemas.html

#FutureDebrief #GeoJSON #MaritimeAnalysis #OpenSource
