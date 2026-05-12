# Phase 0 Research — Storyboard Scene Playback Fidelity & UI Polish

**Feature**: 258 | **Phase**: 0 | **Date**: 2026-05-12

This document resolves all NEEDS CLARIFICATION markers (none were left in spec.md; remaining open design questions are the four gap implementations) and records the planning decisions that downstream tasks depend on. Each decision documents the option chosen, rationale, and rejected alternatives.

The BACKLOG entry for #258 named several file paths and constants that turned out to be slightly off when verified against the codebase. Those discrepancies are recorded here as **C-N** items because they materially change the implementation.

---

## C-1 — "LinkML schema file" location

**Status**: BACKLOG entry was wrong; planning corrects it.
**Backlog said**: `shared/schemas/src/linkml/geojson.yaml`.
**Actual**: `shared/schemas/src/linkml/storyboard.yaml`. `SceneProperties` is defined at lines 90–165 of that file. `geojson.yaml` does not contain `SceneProperties` at all.

**Decision**: All schema edits land in `shared/schemas/src/linkml/storyboard.yaml`.

---

## C-2 — Reuse existing `DisplayModeEnum`

**Status**: BACKLOG entry assumed a new inline enum; planning corrects it.
**Backlog said**: Add `display_mode: 'full' | 'trail'` (implied as an inline string literal type).
**Actual**: `DisplayModeEnum` is already defined in `shared/schemas/src/linkml/session-state.yaml:37-46` with permissible values `full` and `trail`. It is the schema authority for the time-controller's mode.

**Decision**: The new `SceneProperties` slot references `DisplayModeEnum` from `session-state.yaml` rather than introducing a duplicate enum. Cross-schema reference will require a LinkML `imports:` entry in `storyboard.yaml` (or copying the enum if imports prove awkward — to be confirmed during implementation; both routes preserve the Article II.1 single-source-of-truth invariant since the canonical enum stays in session-state.yaml).

**Rejected**:
- Inline string-literal type — duplicates the enum, drifts over time, violates Article II.1.
- Define a second enum in storyboard.yaml — explicit two-source-of-truth violation.

---

## C-3 — "Layers panel" is `FeatureList`, not `LayersToolbar`

**Status**: BACKLOG entry was wrong; planning corrects it.
**Backlog said**: "Layers tree (`shared/components/src/LayersPanel/`)".
**Actual**: There is no `LayersPanel` directory. The button group called `LayersToolbar` is a different thing (Delete / Visibility / Format / Run / Filter actions). The actual tree that lists features-as-leaves is `shared/components/src/FeatureList/`. `FeatureList` already supports parent/child rows via `flattenFeatures.ts` (the pattern used for `Track → Position` rows) and exposes `onToggleExpand` for collapsibility.

**Decision**: Gap (d) ships as an extension of `flattenFeatures.ts`. A new `DisplayItemType` value (`'storyboard'` — naming TBD between `storyboard` and `group`; lean towards `storyboard` for clarity) is added; STORYBOARD_SCENE features are reparented under their `STORYBOARD` feature using the existing `storyboard_id` foreign key. The existing `hasChildSelected()` helper covers FR-012 (collapsed-parent inherits active state).

**Rejected**:
- Build a new collapsible tree in `LayersToolbar` — that component is a toolbar, not a tree; would require a parallel UI that duplicates `FeatureList`.
- Build a new tree from scratch — `FeatureList` already has virtualisation, selection, expansion, and storybook coverage; reusing it is strictly cheaper.

---

## C-4 — Glow / selection-halo CSS pattern

**Status**: BACKLOG entry described a different pattern than what actually exists.
**Backlog said**: "`var(--vscode-focusBorder)` outer glow + ~2px stroke".
**Actual**: The selected-feature treatment in `shared/components/src/MapView/MapView.css` (around lines 63–68) is:
```css
.debrief-mapview .debrief-map-feature--selected {
  filter: drop-shadow(0 0 4px white) drop-shadow(0 0 4px white) drop-shadow(0 0 8px rgba(0, 0, 0, 0.5));
  animation: debrief-selection-pulse 2s ease-in-out infinite;
}
```
Applied by `TemporalTrackLayer.tsx:79-82` via `className="debrief-map-feature--selected"` when `isSelected === true`. `SceneRectangleLayer.tsx` already adds `debrief-scene-rect--current` when `scene.id === currentSceneId`, but the current visual treatment is only a 2px stroke (no halo) — visually indistinguishable on a busy map.

**Decision**: Reuse the existing CSS class `debrief-map-feature--selected` (the canonical Debrief selection-halo) on the active scene rectangle. Add the class alongside `debrief-scene-rect--current`. No new CSS tokens; no new animation; theme-compatibility unchanged.

**Rejected**:
- A bespoke halo for scenes — diverges from the rest of the app, defeats Story 3's "same highlight as tracks" requirement.
- Use `var(--vscode-focusBorder)` as the BACKLOG suggested — that token isn't used for selection halos anywhere in the current map layer; it's a focus-ring token for keyboard navigation. Introducing it here would set a new precedent inconsistent with `TemporalTrackLayer`.

---

## C-5 — Viewport polygon math: Leaflet bounds vs manual EPSG3857

**Status**: BACKLOG entry proposed manual `L.CRS.EPSG3857.latLngToPoint`; planning prefers a simpler primitive.
**Backlog said**: "use Leaflet's projection math (`L.CRS.EPSG3857.latLngToPoint` + the host's CSS-pixel dimensions)".
**Actual**: Leaflet exposes `map.getBounds()` (returns the SW + NE `LatLng` corners of the current viewport) and `map.containerPointToLatLng(point)` (inverse projection from screen pixel to latlng). Either is dramatically simpler than computing through `L.CRS.EPSG3857.latLngToPoint` manually.

**Decision**:
- **Capture-time path** (in `crud.ts:viewportToPolygon` or a helper invoked from `captureScene.ts`): use `map.getBounds()` to get SW/NE, then synthesise the four-corner polygon `[SW, NW, NE, SE, SW]`. This guarantees the polygon matches *exactly* what the user saw at capture time, regardless of viewport aspect ratio or the (center, zoom) round-trip.
- **Render-time fallback** (when `SceneRectangleLayer` detects a legacy placeholder): compute from stored `(viewport.center, viewport.zoom)` plus current `map.getSize()` using `map.containerPointToLatLng({x: 0, y: 0})` and `map.containerPointToLatLng(map.getSize())`. This is approximate (the host's pixel size may have changed since capture) but always strictly better than a 100 m square placeholder.

The current `viewportToPolygon(viewport: Viewport)` signature only takes a `Viewport` (no map handle). To use `getBounds()` at capture time, the function signature changes to accept either a `LatLngBounds` or the map instance. We will introduce a sibling helper `bboxToPolygon(bounds)` and have `captureScene.ts` pass `map.getBounds()` directly; the legacy `viewportToPolygon(viewport)` is kept as the render-time fallback (using the approximate path above) so that one-off callers that don't have a map handle still work.

**Rejected**:
- `L.CRS.EPSG3857.latLngToPoint` route — works but requires two extra coordinate transforms and is more error-prone for code review. No measurable accuracy gain.
- Compute corners purely from `(center, zoom)` ignoring the host's pixel dimensions — fails for non-square maps; produces the same kind of misleading placeholder #258 is trying to retire.

---

## C-6 — Legacy polygon detection via metadata, not geometric heuristic

**Status**: **Revised during `/speckit.review` (2026-05-12)** — the original geometric heuristic was rejected as brittle (a real 100m survey-scale capture would be misclassified). Replaced with explicit provenance metadata.

**Decision**: A new slot `_polygon_source` is added to `SceneProperties`:

```yaml
_polygon_source:
  description: >-
    Provenance of the scene's stored polygon geometry. 'bounds' means the
    polygon was computed from the actual Leaflet map bounds at capture
    time (the post-#258 norm). 'placeholder' means the polygon is a
    pre-#258 ~100m square or otherwise non-bounds-derived. 'manual' is
    reserved for future user-drawn rectangles.
  range: PolygonSourceEnum         # bounds | placeholder | manual
  required: false                  # legacy scenes lack the slot entirely
```

Render-side behaviour: `SceneRectangleLayer` checks `_polygon_source`:
- `'bounds'` → render `scene.geometry` as-is (cheap path; no recompute).
- `'placeholder'`, `'manual'`, or **absent** → recompute the polygon from `(viewport, map.getSize())` using `containerPointToLatLng()`. Memoised by `(scene.id, mapZoom)`.

The stored on-disk geometry is **not** rewritten — Article III.2 source-preservation. Only the displayed polygon is recomputed.

**Rejected**:
- Inline geometric heuristic on `(width, height, centre)` thresholds — false positives on micro-scale legitimate captures.
- Schema-versioned in-place migration — overkill; we're pre-v4.0.0.
- Single boolean `is_placeholder` slot — less extensible than the enum; rules out `'manual'` future cases without re-versioning.

This decision absorbs review item **NEW-B**. See plan.md "Review Outcomes" table.

---

## C-12 — Web-shell playback integration via `onSceneActivated` panel callback

**Status**: Added during `/speckit.review` (Issue 1A).

**Problem**: The original plan said `setDisplayMode` lands "in `executeTransition` and its web equivalent" — but there is no web-shell equivalent of `apps/vscode/src/services/storyboardPlayback.ts`. Web-shell scene-click playback is wired through `App.tsx` (lines 1197–1206) and `StoryboardPanel` directly via `flyToTarget` props.

**Decision**: Add a new optional callback prop on `StoryboardPanel`:

```ts
interface StoryboardPanelProps {
  // ... existing props ...
  onSceneActivated?: (scene: SceneFeature) => void;
}
```

`StoryboardPanel` calls `onSceneActivated(scene)` whenever a scene becomes the current scene (panel-click, map-click, transport advance — the same fire-points that already update `currentSceneIndex`). Each host wires the callback at its own boundary:
- **VS Code**: routes the callback into `storyboardPlayback.executeTransition` — calls `session.setDisplayMode(scene.properties.display_mode)` when slot present.
- **Web-shell**: routes the callback into the `App.tsx` temporal handler (alongside the existing `case 'temporal:displayMode':` block).

This keeps display-mode restoration at the host boundary where it belongs (Article IV.1 — services never touch UI; the *panel* signals, the *host* applies).

**Rejected**:
- Duplicate `storyboardPlayback.ts` as `webStoryboardPlayback.ts` — drift risk between hosts; doubles surface area.
- Put `setDisplayMode` inside `StoryboardPanel` directly — violates Article IV.1 (shared panel reaches into temporal state).
- Defer web-shell display-mode restore — fails SC-006 (all four behaviours ship together).

---

## C-13 — `bboxToPolygon` replaces `viewportToPolygon` at all 3 call sites

**Status**: Added during `/speckit.review` (Issue 2A).

**Problem**: `grep` showed `viewportToPolygon(viewport)` called from 3 sites in `shared/components/src/storyboard/crud.ts`: line 538 (`createScene`), line 643 (`updateScene`), line 1020 (a `restoreScene` or `migrate*` path). The original plan addressed only `createScene`. Leaving the other two unchanged would silently regress to placeholder polygons on edit or restore.

**Decision**: Replace the helper's signature:

```ts
// OLD
function viewportToPolygon(viewport: Viewport): GeoJSONPolygon;

// NEW
function bboxToPolygon(bounds: LatLngBounds, source: PolygonSource): GeoJSONPolygon;
```

All three callers in `crud.ts` are updated to pass `map.getBounds()` + the appropriate `source` value (`'bounds'` for fresh captures, propagated from input for restores). The legacy helper signature is deleted, not deprecated — TypeScript's strict mode forces every caller to be updated before compile passes (Article XV).

The `bounds → polygon` synthesis is trivial: SW + NE corners → `[SW, NW, NE, SE, SW]` closed ring.

**Rejected**:
- Keep both helpers; document which to call where — drift inevitable.
- Update only `createScene` — silent regression on edit (`updateScene`) or migrate path.

---

## C-14 — One targeted unit test for VS Code `executeTransition`

**Status**: Added during `/speckit.review` (Issue 3A); revises C-11.

**Problem**: C-11 originally argued no VS Code unit tests were needed because Playwright covers the user-visible outcome. But `executeTransition` is a 7-push-site orchestrator; a bug in the new `setDisplayMode` branch (e.g. firing from the wrong push site, or firing when `display_mode` is undefined) would not be caught by Playwright running against web-shell, since the two hosts have entirely different playback services.

**Decision**: Add a single targeted unit test in `apps/vscode/src/services/__tests__/storyboardPlayback.test.ts`:

1. Given a scene with `display_mode === 'trail'`, `executeTransition` calls `session.setDisplayMode('trail')` exactly once after `flyToViewport`.
2. Given a scene with `display_mode === undefined` (legacy), `executeTransition` does NOT call `setDisplayMode` and does NOT throw.
3. The `setDisplayMode` call fires only from `executeTransition`, not from the maintenance `pushSceneRectangles` calls at lines 340/445/455/486/538/779.

~20 LOC; uses existing test fixtures + mock session + mock MapPanel port. Cheap insurance against the kind of orchestration bug Playwright literally cannot see.

**Rejected**:
- Full unit coverage of all 7 `pushSceneRectangles` sites — M effort for low marginal value; only the `executeTransition` branch is new.
- No VS Code unit test — leaves the orchestration path unobserved.

---

## C-15 — Scene-count badge on Storyboard parent row

**Status**: Added during `/speckit.review` (NEW-C absorbed into scope).

**Decision**: Each Storyboard parent row in `FeatureList` shows the scene count next to the storyboard name: `My Scenario (5)`. Counts:
- Computed once per render in `flattenFeatures.ts` by counting children passing the `storyboard_id` foreign-key filter.
- Surfaced as a new field on `DisplayItem` (e.g. `childCount?: number`) — populated only for `type: 'storyboard'` rows.
- Rendered by `FeatureRow` after the name; ignores expand/collapse state (count is always visible).
- Empty storyboards display `(0)` — combined with the disabled chevron from FR-013.

i18n: `(N)` numeric format goes through the existing `Intl.NumberFormat` pathway already used by other panel counts. No new string resource.

**Rejected**:
- Move count into the chevron tooltip — invisible until hover; defeats the "scan-at-a-glance" purpose.
- Show count only when collapsed — inconsistent state between expanded and collapsed views.

---

## C-7 — `display_mode` required vs optional in the schema

**Decision**: `display_mode` is **required: false** in the LinkML slot, with **no default**, for the read path. Writers SHOULD populate it; readers MUST tolerate it being absent (covers legacy on-disk scenes).

When `captureScene` writes a new scene, it always populates the slot from `session.getState().displayMode` (which is always defined — Zustand initialises it to `'full'`). New scenes will therefore always have it set; only legacy scenes can have it missing.

Symmetric playback handling: `executeTransition` reads `scene.properties.display_mode` and, if present, calls `session.setDisplayMode(...)`; if absent, the call is skipped (FR-003). No fallback default is applied — silently switching legacy scenes to `'full'` would be a Article I.3 violation (state-change without user intent).

**Rejected**:
- Required + default `'full'` — forces every legacy scene to suddenly mean "Full mode", contradicting FR-003 and Article I.3.
- Required + no default + writer error on missing — would break read of every existing storyboard; impossible per Article XIV (we're pre-v4.0.0 but still need test fixtures to load).

---

## C-8 — Two host code paths (VS Code + web-shell)

**Decision**: Implement gaps (a) and (d) in both `apps/vscode/src/commands/captureScene.ts` + `apps/vscode/src/services/storyboardPlayback.ts` **and** their `apps/web-shell/src/commands/captureSceneWeb.ts` counterparts. Both hosts read from the same `@debrief/session-state` Zustand store, so the new line is symmetric: `displayMode = session.getState().displayMode` at capture, `session.getState().setDisplayMode(scene.properties.display_mode)` at playback.

Gaps (b) and (c) are entirely in `shared/components/` and therefore land once, consumed by both hosts.

---

## C-9 — FeatureList parent-row labelling and i18n

**Decision**: The Storyboard parent row's label is `properties.name` (already a required slot on `StoryboardProperties`). No new user-facing string is introduced; we route the label through the existing `FeatureRow` rendering pipeline, which already handles i18n via the project's standard mechanism (Article XI.1).

A nuance: when a Storyboard has zero scenes (edge case in spec.md), the parent row still renders. The chevron is rendered disabled in this case to make the empty state discoverable (FR-013).

---

## C-10 — Single-active-scene invariant

**Decision**: `SceneRectangleLayer` already receives `currentSceneId: string | null` (single value, not a set). FR-008 (at most one halo) is therefore enforced by data-flow, not by extra logic. The new code adds the `debrief-map-feature--selected` class only when `scene.id === currentSceneId`. No bookkeeping required.

---

## C-11 — Test strategy: schema gate vs unit vs E2E

Mirrors the Article VI division of labour and the Quality Rubric for "schema + component + workflow" features:

| Layer | What it proves | Where |
|---|---|---|
| Schema adherence | New `display_mode` slot round-trips Python ↔ JSON ↔ TS | `shared/schemas/tests/` — new golden fixture + round-trip case |
| Unit (component-library) | `viewportToPolygon` produces sensible bounds; `flattenFeatures` groups STORYBOARD_SCENE under STORYBOARD; `SceneRectangleLayer` applies the halo class when `currentSceneId` matches; legacy-placeholder heuristic fires correctly | `shared/components/src/**/__tests__/*` extensions |
| Workflow (Playwright web-shell) | Capture in Trail → click scene in FeatureList → mode actually switches to Trail; capture two scenes at different zooms → rectangle sizes differ; storyboard parent collapses children | `apps/web-shell/playwright/tests/storyboard-*.spec.ts` |

VS Code unit tests for `executeTransition` are *not* required (the playback service is a thin orchestrator; the meaningful behaviour is observable end-to-end in the web-shell, which exercises the same shared component layer). This avoids duplicating coverage.

---

## Summary of decisions

| # | Decision | Rejected alternative |
|---|---|---|
| C-1 | Edit `storyboard.yaml`, not `geojson.yaml` | (BACKLOG was wrong) |
| C-2 | Reference existing `DisplayModeEnum` | New inline enum |
| C-3 | Gap (d) lands in `FeatureList/flattenFeatures.ts` | New tree component |
| C-4 | Reuse `debrief-map-feature--selected` halo CSS | New focusBorder-based halo |
| C-5 | Use `map.getBounds()` at capture, `containerPointToLatLng` fallback at render | Manual EPSG3857 math |
| C-6 | **(revised post-review)** Metadata-based legacy detection via new `_polygon_source` slot | Geometric heuristic on bbox size/centre |
| C-7 | `display_mode` optional in schema; symmetric skip on read | Required + default 'full' (breaks FR-003) |
| C-8 | Implement (a) + (d) symmetrically in both hosts | VS-Code-only |
| C-9 | Storyboard row label = `properties.name` (existing i18n) | New string resource |
| C-10 | Single-active invariant enforced by `currentSceneId: string \| null` data flow | Add separate tracking |
| C-11 | **(revised by C-14)** Add one targeted VS Code unit test for `executeTransition` display-mode branch | No VS Code unit tests at all |
| C-12 | Web-shell playback integration via new `onSceneActivated` callback prop on `StoryboardPanel` — both hosts wire at boundary | Duplicate playback service in web-shell |
| C-13 | `bboxToPolygon(bounds, source)` replaces `viewportToPolygon`; TypeScript forces update at all 3 crud.ts call sites | Keep both helpers; doc; or update only one site |
| C-14 | One ~20-LOC targeted unit test for `executeTransition` display-mode branch | Full coverage of all 7 push sites; or none |
| C-15 | Scene-count badge `(N)` on Storyboard parent row, always visible regardless of collapse state | Hover tooltip; only-when-collapsed |

All NEEDS CLARIFICATION markers from spec.md: **0 outstanding** (the spec was clarification-clean as written; the open design questions resolved above were planning-time decisions, not stakeholder questions).
