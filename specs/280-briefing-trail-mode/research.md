# Phase 0 Research: Briefing Renderer Honours Trail Display Mode

**Feature**: 280-briefing-trail-mode
**Date**: 2026-06-01
**Input**: [spec.md](./spec.md)

This is a small, well-bounded render-side bug fix. There were no open
`[NEEDS CLARIFICATION]` markers in the spec; the research below records the
technical decisions that pin the implementation down and de-risk it against the
existing #264 air-gapped tests.

---

## Decision 1 — Reuse `sliceTrackToTime` from `@debrief/utils` for trail trimming

**Decision**: Compute the trail by calling the existing
`sliceTrackToTime(coordinates, timestampsMs, currentTime)` helper exported from
`@debrief/utils` (`shared/utils/src/temporal.ts`). Add `@debrief/utils` as a
direct `workspace:*` dependency of `@debrief/briefing-renderer`.

**Rationale**:
- This is the **exact** helper the main application uses to render Trail mode
  (`shared/components/src/MapView/temporal-utils.ts` re-exports it; the
  `TemporalTrackLayer` slices with it). Reusing it makes the exported briefing's
  trail **byte-for-byte identical** in shape to the in-app preview — satisfying
  **FR-008** (visual parity) by construction, with zero risk of algorithm drift.
- The helper is pure, already unit-tested in `@debrief/utils`, and O(log n)
  (binary search) + O(k) slice — cheap enough to call per animation frame.
- `@debrief/utils` is an **internal workspace package**, already built in the
  monorepo (it is a transitive dependency via `@debrief/components`). Adding it
  as a direct dep is not an Article IX "external dependency" concern.

**Alternatives considered**:
- *Inline a copy of the slice logic in the renderer* — rejected: duplicates ~15
  lines that must stay in lock-step with the main app; the drift it invites is
  precisely what FR-008 guards against.
- *Import the re-export through `@debrief/components`* — rejected: `@debrief/components`
  does not surface `sliceTrackToTime` from its public root or a clean subpath;
  reaching into `@debrief/components/MapView` internals to borrow a utility is
  worse than depending on the utility's own package directly.

---

## Decision 2 — Render time-stamped tracks as stable-keyed `<Polyline>`; update positions in place

**Decision**: Render each visible time-stamped track (`LineString` with a
parallel `properties.timestamps` array) as its own react-leaflet `<Polyline>`
with a **stable key** (`trail-<featureId>`). The `positions` prop is the *display
coordinates*: the full track in Full/legacy mode, or `sliceTrackToTime(...,
currentTime)` in Trail mode. Non-time-stamped line and area features (polygons,
multi-segment annotations, lines without parallel timestamps) continue to render
through the existing single `<GeoJSON>` layer.

**Rationale**:
- In Trail mode the visible geometry changes on **every** `currentTime` update
  (every slider drag step and every playback tween frame). A `<Polyline>` with a
  stable key lets react-leaflet update the underlying Leaflet path's latlngs
  **in place** — smooth growth, no teardown — exactly the mechanism the existing
  moving position dots already use (`CircleMarker` with stable `time-marker-<id>`
  keys whose `center` changes each frame).
- The current code re-keys the `<GeoJSON>` layer (`geoJsonKey`) only on
  scene/visibility change. Folding `currentTime` into that key would tear down
  and rebuild the whole GeoJSON layer every frame — the precise per-frame churn
  the code already warns about (see the `handleMapReady` gate comment referencing
  the #264 slider oscillation). Per-track Polylines avoid this entirely.
- Keeping non-temporal features in `<GeoJSON>` means polygons/annotations are
  untouched (FR-009) and the static-context render path is unchanged.

**Alternatives considered**:
- *Recompute the `<GeoJSON>` `data` and re-key per frame* — rejected: per-frame
  layer teardown (jank + the known oscillation failure mode).
- *Imperatively `setLatLngs` on a Leaflet polyline via a ref* — rejected:
  re-introduces imperative layer management that react-leaflet exists to avoid;
  the declarative `<Polyline positions=…>` already updates in place.

**Regression-risk note**: I verified the existing renderer tests are **not**
pixel-diff gates — `briefing-zip-screenshots.spec.ts` calls
`page.screenshot({ path })` to *write* evidence PNGs, and
`briefing-zip-playback.spec.ts` asserts transport behaviour (Next/Prev/Replay,
slider visibility). So moving tracks from one Leaflet layer type to another does
not trip a stored-screenshot comparison. The deliberately air-gapped **boot**
path (`boot.ts`, inlined-JSON) is not touched by this change, honouring FR-006
and the #264 "air-gapped path stays untouched" constraint.

---

## Decision 3 — Treat only `display_mode === 'trail'` as Trail; everything else is Full

**Decision**: Derive `const isTrail = currentScene?.properties.display_mode === 'trail'`.
Any other value — `'full'`, `undefined` (legacy/pre-#258), or an unrecognised
string — renders the full track.

**Rationale**:
- One predicate cleanly satisfies **FR-002** (Full), **FR-003** (absent ⇒ Full,
  no error), and the "unrecognised value ⇒ Full" edge case — the safe,
  non-destructive default consistent with #258 FR-003.
- `SceneFeature.properties.display_mode` is typed `DisplayMode | undefined`
  (`'full' | 'trail'`); comparing against the `'trail'` string literal is fully
  type-safe and needs no `any` (Article XV).

**Alternatives considered**:
- *Switch on every enum member* — unnecessary; the binary "is it trail?" question
  is all the renderer needs and is robust to a malformed value.

---

## Decision 4 — Trail-mode fallback for tracks without usable per-vertex timing

**Decision**: A track that is a `LineString` but lacks a usable parallel
`timestamps` array (missing, wrong length, or unparseable) is **not** treated as
a temporal track. It renders in full via the `<GeoJSON>` layer in both modes, and
shows no moving dot — exactly as today.

**Rationale**:
- Satisfies **FR-007** (graceful fallback, no blank track, no error) by reusing
  the same validity gate the existing `interpolateTrackPosition` already applies
  for the dot (`coords.length === times.length`, ≥2 points, all `Date.parse`
  succeed). One shared predicate keeps the trail and the dot consistent: a track
  either participates in *both* time-driven behaviours or *neither*.

**Alternatives considered**:
- *Render an empty/partial line for malformed tracks in Trail mode* — rejected:
  produces a confusing blank where context is expected; the full line is the
  safe, informative fallback.

---

## Decision 5 — Test fixtures must add `display_mode`; tests-first

**Decision**: The existing `dev-fixture.ts` scenes do **not** set `display_mode`.
Author small unit-test fixtures (or extend the dev fixture) with at least one
`trail` scene and one `full` scene, and write the unit tests **before** the
implementation (Article VII). The Playwright "growth" test drives the renderer at
two playback positions on a Trail scene and asserts the rendered trail length
increases.

**Rationale**:
- Article VI/VII: tests define done. The unit tests pin the pure mapping
  (mode + currentTime ⇒ display coordinates); the Playwright test pins the
  observable growth and produces the evidence screenshot the backlog requires.
- Keeping a `full`/absent fixture in the suite is the executable **regression
  guard** for FR-002/FR-003.

**Alternatives considered**:
- *Only Playwright coverage* — rejected: the pure slice/mapping decision is
  cheapest and most precisely covered by fast unit tests; Playwright then only
  has to prove the wiring (currentTime ⇒ visible growth).

---

## Summary of resolved unknowns

| Question | Resolution |
|----------|------------|
| How to compute the trail? | Reuse `sliceTrackToTime` from `@debrief/utils` (parity with main app) |
| How to render a growing line without per-frame jank? | Stable-keyed `<Polyline>`, positions updated in place |
| How to classify Full vs Trail vs legacy vs malformed mode? | `display_mode === 'trail'` ⇒ trail; else full |
| What about tracks lacking timestamps in Trail mode? | Full-line fallback via `<GeoJSON>`, no dot (same gate as today) |
| New dependency? | `@debrief/utils` as `workspace:*` (internal package, justified) |
| Regression risk to #264? | Low — no pixel-diff gate; air-gapped boot path untouched |
