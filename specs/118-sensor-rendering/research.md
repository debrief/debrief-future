# Research: 118 Sensor Rendering

**Date**: 2026-04-10 | **Branch**: `118-sensor-rendering`

## Research Questions

### RQ-1: Leaflet Canvas vs SVG for bearing line rendering

**Decision**: Use Leaflet's L.Canvas renderer (via `preferCanvas: true` on the map) with a custom `L.Layer` subclass that draws directly onto the shared canvas.

**Rationale**: Bearing lines are potentially very numerous (thousands of contacts across multiple sensors). Canvas rendering avoids DOM overhead -- each SVG element creates a DOM node, while canvas draws directly to a bitmap. The existing `TemporalTrackLayer` and `PositionSymbolsLayer` use react-leaflet wrappers around standard Leaflet primitives (`GeoJSON`, `CircleMarker`, `Marker`). For sensor rendering, a custom canvas layer is more appropriate because:
1. Bearing lines are ephemeral visual guides, not interactive GeoJSON features
2. The number of lines can be very large (1000+ contacts)
3. Lines need alpha blending for snail mode fading, which canvas handles natively
4. Viewport culling is straightforward with canvas (`isPointInBounds` checks)

**Alternatives considered**:
- **react-leaflet `<Polyline>` components**: Simple but creates one React element per line; will not scale to 1000+ contacts
- **SVG overlay**: Same DOM overhead as react-leaflet components
- **WebGL (e.g., Leaflet.glify)**: Overkill for line rendering; adds dependency; WebGL context limits could conflict with tile layers

### RQ-2: React integration pattern for custom Leaflet canvas layer

**Decision**: Create a React component (`SensorBearingLayer.tsx`) that wraps a custom `L.Layer` subclass. Use `useMap()` to access the Leaflet map instance, and manage the layer lifecycle via `useEffect`. The custom layer registers a `drawLayer` callback with L.Canvas.

**Rationale**: This follows the same pattern used by `LeafletToolbar.tsx` which accesses the map instance directly. The react-leaflet `createLayerComponent` utility could work but custom canvas drawing requires direct access to the `CanvasRenderingContext2D`, which is easier to manage imperatively.

**Alternatives considered**:
- **`createLayerComponent` from react-leaflet**: Possible but awkward for canvas-based layers that don't extend `L.Path`
- **Pure Leaflet plugin outside React**: Loses React lifecycle management and prop reactivity

### RQ-3: Bearing line geometry calculation

**Decision**: Compute bearing line endpoints using geodesic bearing from the sensor origin. For contacts with a `range` value, the far end is at `(origin, bearing, range)`. For contacts without range, extend to `MAXIMUM_SENSOR_BEARING_RANGE = 5 degrees` of latitude (matching legacy), capped at twice the viewport diagonal.

**Rationale**: The legacy `SensorContactWrapper.getFarEnd()` uses a cap of 5 degrees (defined as `MAXIMUM_SENSOR_BEARING_RANGE`). This prevents infinite lines while ensuring they visually extend to the edge of the viewport. Using geodesic calculations (via `L.CRS.Earth` or a simple haversine destination formula) ensures accuracy at all latitudes.

**Alternatives considered**:
- **Viewport edge clipping only**: Would lose the 5-degree semantic cap from legacy
- **Fixed pixel length**: Would change meaning at different zoom levels

### RQ-4: Sensor origin calculation (pre-#119 array offsets)

**Decision**: For #118, the sensor origin is the host track's interpolated position at the contact timestamp. Array offset modes (PLAIN, WORM, MEASURED from #119) are not implemented here -- the origin defaults to the host platform position. The architecture must allow #119 to provide a different origin without changing the rendering layer.

**Rationale**: #118 depends on #116 and #117 but NOT #119. The rendering layer should accept a pre-computed origin per contact rather than computing it internally. This keeps the rendering layer pure (display only) and lets #119 provide offset-adjusted origins later.

**Alternatives considered**:
- **Implement PLAIN mode in #118**: Scope creep; PLAIN is trivial but belongs in #119's coherent treatment of all three modes
- **Hard-code origin to track start**: Too crude; interpolation at contact time is needed

### RQ-5: Interpolating host position at contact timestamp

**Decision**: Use binary search on the track's `positions[]` array (which is time-sorted) to find the two positions bracketing the contact time, then linearly interpolate latitude and longitude. Reuse the existing `findNearestPointIndex` from `temporal-utils.ts` with a linear interpolation extension.

**Rationale**: The track's `positions[]` and `geometry.coordinates[]` arrays are parallel and time-sorted. The existing `findNearestPointIndex` provides O(log n) lookup. For accurate bearing line origins, linear interpolation between the two nearest fixes produces better results than snapping to the nearest fix.

**Alternatives considered**:
- **Snap to nearest fix**: Simpler but produces visually incorrect origins when fix intervals are large
- **Cubic interpolation**: More accurate but unnecessary for the visual precision needed

### RQ-6: Port/starboard bearing colour convention

**Decision**: Implement the legacy convention: primary bearing uses the sensor/contact base colour; ambiguous bearing uses a darker shade. Port/starboard determination uses `relBearing(course, bearing)` which returns the relative bearing (-180 to +180). Port bearings (negative relative bearing) keep the base colour; starboard bearings (positive) also keep the base colour -- the darkened shade is only for the ambiguous bearing line, not port/starboard differentiation.

**Rationale**: Reading the legacy code more carefully: `SensorContactWrapper.paint()` draws the primary bearing in the contact's colour and the ambiguous bearing in `baseColor.darker()`. The port/starboard logic (`isBearingToPort()`) exists but is used for other purposes (e.g., ambiguity resolution), not for rendering colour selection. The rendering simply draws primary in base colour, ambiguous in darker shade.

**Alternatives considered**:
- **Colour by port/starboard**: Not what legacy does for rendering; would confuse experienced users

### RQ-7: Snail mode integration with existing temporal state

**Decision**: The sensor layer reads `currentTime` and `displayMode` from the same props passed through `MapView`. In snail/trail mode, contacts within the trail window are rendered with fading. The trail window length comes from the temporal state's time range. The fading formula matches legacy: `proportion = (trailLength - age) / trailLength`, applied to RGB channels as `Color(R*p, G*p, B*p)`.

**Rationale**: The existing `TemporalTrackLayer` already receives `currentTime` and `displayMode` as props. The sensor layer follows the same pattern, receiving these from `MapView` and applying the fade algorithm.

**Alternatives considered**:
- **Separate snail mode state for sensors**: Inconsistent with existing temporal architecture
- **CSS opacity instead of colour fading**: Wouldn't match legacy's fade-to-black appearance

### RQ-8: Sensor arc rendering approach

**Decision**: Render sensor arcs as filled SVG/canvas fan shapes using `arc()` and `lineTo()` calls. An arc has: origin point, left angle, right angle, inner range, outer range. The shape is a "donut wedge" -- two concentric arcs connected by radial lines.

**Rationale**: The legacy `DynamicTrackCoverageWrapper` renders arcs as filled fans. Canvas `arc()` is ideal for this. The shape is: line from inner-left to outer-left, arc from outer-left to outer-right, line from outer-right to inner-right, arc from inner-right to inner-left (if inner range > 0).

**Alternatives considered**:
- **GeoJSON Polygon approximation**: Would require discretising the arc into many line segments; less performant and less visually smooth
- **Leaflet.Circle/Semicircle plugin**: Doesn't support donut/wedge shapes with inner radius

### RQ-9: Schema readiness -- display properties gap

**Decision**: The current schema (`SensorContact`, `SensorData`) lacks display properties planned for #116 (color, visible, line_style, label_location, show_label, put_label_at on SensorContact; color, visible, line_thickness on SensorData). For #118, use sensible defaults: inherit colour from the track's `style.line.color`, all contacts visible, solid lines, labels shown at END position. When #116 adds display properties, the rendering layer reads them from the data.

**Rationale**: #118 depends on #116 being complete, so by implementation time these display properties should exist in the schema. However, the rendering code should have fallback defaults for any missing display properties, making it resilient to partial schema migration.

**Alternatives considered**:
- **Block on #116 completion**: The dependency is already stated; this research just documents the fallback strategy

### RQ-10: Performance -- viewport culling strategy

**Decision**: Before rendering each frame, compute the map's current bounds (lat/lon bbox). Skip any contact whose computed origin falls outside the bounds (with a small padding buffer). For contacts without explicit origin, the host track's position at contact time determines visibility.

**Rationale**: With thousands of contacts, iterating all contacts per frame is acceptable (O(n) with cheap bounds checks), but drawing off-screen lines wastes canvas operations. The Leaflet canvas renderer already clips paths, but skipping the draw calls entirely is more efficient.

**Alternatives considered**:
- **Spatial index (R-tree)**: Overhead not justified for the expected contact counts (10k is upper bound)
- **Rely on Leaflet's built-in clipping**: Works but wastes CPU on path setup for off-screen elements
