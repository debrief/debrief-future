# Research: 119 Array Offset Calculations

**Date**: 2026-04-10 | **Branch**: `119-array-offset-calc`

## Research Questions

### RQ-1: Where should array offset calculation logic live?

**Decision**: Implement the calculation as a pure function module in `shared/components/src/MapView/array-offset.ts` (TypeScript) alongside the existing `sensor-utils.ts`. Additionally, implement a parallel Python module in `services/calc/debrief_calc/tools/sensor/array_offset.py` for server-side calculations (needed by sensor tools like generate-sensor-range-plot).

**Rationale**: The primary consumer of array offset calculations is the rendering pipeline in `sensor-utils.ts:prepareSensorContacts()` (line 377), which currently interpolates the host track position as the bearing line origin. The calculation must run at render time in the browser (TypeScript). The Python implementation is needed because calc tools like `generate-sensor-range-plot` and `insert-sensor-arc` also need correct array centres for their geometry calculations.

**Alternatives considered**:
- **Python-only with MCP call**: Would introduce a network round-trip on every render frame -- violates offline-first (Constitution I.1) and would make rendering unacceptably slow
- **TypeScript-only**: Would leave Python calc tools using incorrect origins; not acceptable since SC-005 requires tools to use calculated array centres
- **Shared WASM module**: Over-engineered for math that's a few hundred lines; adds build complexity

### RQ-2: How to integrate with the existing rendering pipeline?

**Decision**: Modify `prepareSensorContacts()` in `sensor-utils.ts` to call a new `computeArrayCentre()` function between the host position interpolation step (line 421-427) and the far-end computation (line 432). The new function takes the interpolated host position, the sensor's `array_centre_mode`, `offset`, `measured_positions`, and track data, and returns the adjusted origin.

**Rationale**: The integration point is clear. Currently:
```
origin = contact.origin ?? interpolateTrackPosition(...)
```
After #119:
```
hostPosition = interpolateTrackPosition(...)
origin = contact.origin ?? computeArrayCentre(hostPosition, sensor, track, contactTimeMs)
```
The explicit `contact.origin` override still takes precedence (backward compatible). When no array offset mode is set or offset is zero, `computeArrayCentre` returns the host position unchanged.

**Alternatives considered**:
- **Pre-compute origins and store on SensorContact.origin**: Would require mutating the data model; violates data sovereignty (Constitution III.2 -- source preservation)
- **Separate rendering layer**: Unnecessary; the existing pipeline already computes per-contact origin

### RQ-3: PLAIN mode -- geodesic backtrack calculation

**Decision**: Use the existing `geodesicDestination()` function from `sensor-utils.ts` with a reverse bearing (course + 180°) and the sensor's offset distance. The vessel's course at the contact timestamp is obtained via `interpolateTrackCourse()` (already exists in `sensor-utils.ts:309`).

**Rationale**: PLAIN mode is `arrayCentre = geodesicDestination(vesselPosition, (course + 180) % 360, offset)`. All the building blocks exist. The `interpolateTrackCourse()` function currently uses nearest-neighbour lookup for course, which is sufficient for PLAIN mode (FR-007 says "interpolated course" but the existing positions already store course per fix; nearest-neighbour between closely spaced fixes provides adequate accuracy). True angular interpolation would require handling 0/360 wraparound and is not needed given typical fix intervals of 1-60 seconds.

**Alternatives considered**:
- **Linear interpolation of course**: Complex due to angular wraparound (e.g., interpolating between 350° and 10° must go through 0°, not 180°). The additional accuracy vs nearest-neighbour is negligible for sub-minute fix intervals. If future precision requirements demand it, the function can be upgraded without API changes.

### RQ-4: WORM mode -- track backtracking algorithm

**Decision**: Implement a `backtrackAlongTrack()` function that walks backward from the vessel's current position along the track's coordinate segments, accumulating geodesic distances until the offset distance is reached. The result is a point interpolated on the final segment.

**Algorithm**:
1. Find the vessel's position index at the contact time (binary search)
2. Walk backward through track coordinates: `i = currentIdx, i-1, i-2, ...`
3. For each segment `[coords[i], coords[i-1]]`, compute its geodesic length
4. Accumulate distance; when accumulated distance + current segment length >= offset, interpolate the exact point along this segment
5. If total track length is exhausted before reaching offset, return the earliest track point

**Rationale**: This directly models the physical behaviour of a towed array following the vessel's path. The haversine distance function already exists (duplicated in `track_stats.py` and `generate_courses_speeds.py`). For TypeScript, a haversine distance function needs to be added to `sensor-utils.ts` (or extracted to a shared geo-utils module).

**Alternatives considered**:
- **Pre-compute cumulative distances for the whole track**: Faster O(1) lookup per contact but wastes memory for the full track when only a few hundred metres of backtrack are needed. Could be a future optimisation if profiling shows WORM is a bottleneck.
- **Euclidean approximation**: Inaccurate at high latitudes; not acceptable for a defence-grade tool (Constitution I.4 -- reproducibility)

### RQ-5: MEASURED mode -- temporal interpolation strategy

**Decision**: Linear interpolation of longitude and latitude between the two measured positions that bracket the contact timestamp. Use binary search on the sorted `measured_positions` time-series. If the contact time falls outside the measured range, fall back to PLAIN mode.

**Rationale**: Linear interpolation matches the approach used for host track position interpolation (`interpolateTrackPosition()` in `sensor-utils.ts:222`). Measured positions are typically close together in time and space, so linear interpolation is adequate. The fallback to PLAIN mode (not WORM) is specified in the feature description and matches legacy behaviour -- MEASURED mode is selected when you have measurement data; the absence of data at a specific time is treated as "use the simple approximation" rather than the complex WORM model.

**Alternatives considered**:
- **Great-circle interpolation**: More accurate over long distances but measured positions are typically metres apart; the difference is sub-millimetre
- **Fallback to WORM instead of PLAIN**: Not legacy behaviour and not specified in the requirements
- **No fallback (skip contact)**: Would leave contacts without origins, breaking rendering

### RQ-6: Haversine distance -- deduplication opportunity

**Decision**: Extract a shared `haversineDistanceMetres(lon1, lat1, lon2, lat2)` function. In TypeScript, add it to `sensor-utils.ts` (needed for WORM mode segment distance accumulation). In Python, add it to a shared geo module or keep it local to `array_offset.py` since the existing duplicates in `track_stats.py` and `generate_courses_speeds.py` return nautical miles while this feature needs metres.

**Rationale**: The WORM algorithm needs point-to-point distance in metres for track-path accumulation. The existing Python functions return nautical miles. Rather than converting units, a metres-native function is cleaner. The TypeScript side has `geodesicDestination()` but no haversine distance function.

**Alternatives considered**:
- **Convert existing nm functions**: Adds a magic constant multiplication that's easy to get wrong
- **Pull in a geo library (e.g., turf.js, geopy)**: Overkill for one function; violates Constitution IX.1 (minimal dependencies)

### RQ-7: Cache invalidation strategy

**Decision**: No explicit cache to invalidate. The rendering pipeline recomputes origins on every render call (`prepareSensorContacts()` is called each time the layer draws). When sensor properties change (mode or offset), React re-renders the component with new props, which triggers a fresh call to `prepareSensorContacts()`. The Python side has no caching either -- tools compute origins on demand per invocation.

**Rationale**: The current rendering architecture is stateless -- `prepareSensorContacts()` is pure and recomputes everything each frame. This means FR-005 and FR-006 (invalidation on mode/offset change) are satisfied by the existing React reactivity model: changing `sensor.array_centre_mode` or `sensor.offset` in the session state triggers a re-render, which triggers a fresh computation. No explicit cache invalidation code is needed.

**Alternatives considered**:
- **Memoisation with cache key**: Could improve performance but adds complexity. The existing architecture handles 1000+ contacts per frame without issues (SC-004 specifies 1 second for 1000 contacts, and the current pipeline already processes this volume)
- **Explicit invalidation events**: Adds coupling between the property editor and the rendering layer; unnecessary given React's prop-driven re-rendering

### RQ-8: Python-TypeScript algorithm parity

**Decision**: Implement identical algorithms in both languages with shared golden test cases. The golden fixtures in `shared/schemas/src/fixtures/valid/track-feature-sensors-measured-01.json` provide test data. Additional test fixtures with known expected outputs will be created for each mode.

**Rationale**: Constitution I.4 requires reproducibility. The same input data must produce the same array centre positions regardless of whether the calculation runs in the browser (TypeScript) or on the server (Python). Golden test cases ensure parity. The algorithms are pure math (haversine, linear interpolation) with well-defined inputs and outputs, making cross-language testing straightforward.

**Alternatives considered**:
- **Single-language implementation**: Would leave one consumer (tools or rendering) without correct origins
- **Code generation from a shared spec**: Over-engineered for ~200 lines of math
