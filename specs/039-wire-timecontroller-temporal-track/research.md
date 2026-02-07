# Research: 039 — Wire TimeController to TemporalTrackLayer

## R1: How does the temporal subscription carry displayMode?

**Decision**: `subscribeToTemporal` already fires on any `TemporalSlice` change, which includes `displayMode: 'normal' | 'snailTrail'`. MapPanel already subscribes but only reads `currentTime`. Extend the callback to also forward `displayMode`.

**Rationale**: No new subscription needed — just read the additional field from the same callback.

**Alternatives**: Subscribe to displayMode separately via `subscribeToSlice` — rejected (unnecessary granularity; the temporal subscription already fires for both).

## R2: DisplayMode naming mismatch

**Decision**: Map between session-state naming (`'normal' | 'snailTrail'`) and TimeController naming (`'full' | 'trail'`) at the map webview message boundary. The map webview will use `'full' | 'trail'` internally for consistency with the shared component terminology.

**Rationale**: `timeRangeView.ts` already does this mapping (line 254: `'trail' → 'snailTrail'`). The reverse mapping in MapPanel keeps the webview API clean.

**Alternatives**: Use session-state naming everywhere — rejected (would diverge from shared component naming and spec terminology).

## R3: Track.times format (ISO strings vs epoch ms)

**Decision**: `Track.times` is `string[]` (ISO 8601). Convert to `number[]` (epoch ms) once when tracks are loaded, cache per track in `TrackRenderer`. The temporal algorithms (`findNearestPointIndex`, `sliceTrackToTime`) operate on `number[]` for binary search efficiency.

**Rationale**: Parsing ISO strings on every frame would be expensive. Parse once, cache, reuse.

**Alternatives**: Parse on the fly — rejected (O(n) parsing per frame per track). Store epoch in Track type — rejected (would require upstream changes to the message protocol).

## R4: Port vs import shared temporal-utils

**Decision**: Port the two pure functions (`findNearestPointIndex`, `sliceTrackToTime`) into a new `temporalUtils.ts` file in the webview bundle. Do not import from `shared/components` — that package has React/Leaflet-React dependencies incompatible with the vanilla JS webview.

**Rationale**: The functions are ~60 lines of pure logic. Copying avoids build-time dependency on React. Tests ensure correctness independently.

**Alternatives**: Configure a shared pure-utils package — over-engineered for 2 functions. Import and tree-shake — fragile with the current build setup.

## R5: Re-rendering strategy for temporal updates

**Decision**: On `setCurrentTime`, only update the Leaflet layers (polyline coordinates + marker position) — do not clear and re-render all tracks. Use `polyline.setLatLngs()` for coordinate updates and move/create/remove the highlight marker.

**Rationale**: Full re-render on every frame would cause flickering and poor performance during playback. Leaflet's `setLatLngs()` is optimised for this.

**Alternatives**: Full clear + re-render — rejected (flickering, O(n) DOM operations per frame). React integration — rejected (scope).

## R6: Highlight marker implementation

**Decision**: Use `L.circleMarker` for the highlight marker (matches `TrackHighlightMarker` appearance from shared components). One marker per visible track in `full` mode. Store in a parallel `Map<string, L.CircleMarker>` alongside `trackLayers`.

**Rationale**: `circleMarker` is lightweight, doesn't need custom icons, and supports easy repositioning via `setLatLng()`.

**Alternatives**: `L.marker` with custom icon — heavier DOM element, unnecessary. SVG overlay — more complex, no benefit.
