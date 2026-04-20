# Add storyboarding capability for mission/exercise briefings

## Problem

Analysts need a way to create guided walkthroughs of recorded exercises for briefings and training. Sharing analysis insights currently requires either live screen-sharing or exporting static images that lack context and narrative flow. There is no way to capture "this is what I saw, at this time, with these tracks visible, in this framing" and replay it in order for a stakeholder audience.

## Proposed Solution

Introduce a **Storyboard** concept: a named, ordered sequence of **Scenes** attached to a plot. Each scene captures the analyst's current map viewport, timestamp, and per-feature visibility at the moment of capture, together with a thumbnail. Scenes are first-class GeoJSON Features (not UI state), so they round-trip through the existing plot-edit path and are validated by LinkML-generated schemas.

A storyboard panel in the Map Viewer provides capture, editing, and forward/backward preview. A **dedicated briefing renderer** (the "distraction-free" playback surface) is explicitly deferred to a follow-up spec.

### Core interactions

1. **Capture** — `Ctrl/Cmd+Alt+C` (or panel button) captures a new scene from the current viewport + time slider + feature visibility. First capture on a plot prompts for a storyboard name. Subsequent captures append to the active storyboard. Default scene title is the date-time-group (DTG) of the captured timestamp; analyst can overtype.
2. **Edit** — inline rename, markdown description, soft-delete with toast-undo, `insert-middle` (capture at an intermediate timestamp), `update-to-current` (full re-snapshot of viewport + time + visibility), `duplicate` (prompts for new timestamp), `copy-to-other-storyboard` (deep-copies the thumbnail asset; destination chosen via dropdown quick-pick). **No drag-reorder** — ordering is driven by captured timestamp.
3. **Preview playback** — forward/backward buttons + scoped `Left`/`Right` arrow keys step scenes. Map animates (`flyTo` + time tween) to the target scene; transition duration is per-scene (field defaults to a fixed constant). While a storyboard is playing, the time slider is scrubbable only within `[current_scene.t, next_scene.t]` (locked beyond the last scene).
4. **Multi-storyboard** — a plot can carry several storyboards; the panel header is a dropdown. The "active" storyboard is ephemeral (panel selection only; defaults to most-recently-modified on plot open).

### Map rendering

The parent Storyboard Feature is hidden from the map. Scene Features render as faint viewport rectangles **only when their parent is the active storyboard**. Clicking a rectangle selects the scene in the panel and animates the map to its viewport.

## Data Model

Storyboards and Scenes are added to the LinkML master schema in `shared/schemas/` (per Article II) and generate Pydantic + JSON Schema + TypeScript. Both are standard GeoJSON Features carried inside the plot's FeatureCollection — the STAC layer sees them as generic features and requires no API changes.

### Storyboard Feature (parent)
- `geometry`: `Polygon` — union of child scene viewport bounds (computed; acts as an overview hull).
- `properties`:
  - `debrief:type`: `"storyboard"`
  - `id`: stable identifier
  - `name`: display title
  - `description`: markdown (rendered in panel and downstream renderer)
  - `schema_version`: integer (migration vector; starts at `1`)
  - Provenance: `created_by`, `created_at`, `last_modified_by`, `last_modified_at`, `history[]` of `{timestamp, actor, op, summary}`

### Scene Feature (child)
- `geometry`: `Polygon` — viewport bounds at capture time.
- `properties`:
  - `debrief:type`: `"storyboard_scene"`
  - `id`: stable identifier
  - `storyboard_id`: FK to parent
  - `title`: defaults to DTG of `timestamp`
  - `description`: markdown (optional)
  - `viewport`: `{ center: [lon, lat], zoom, bearing }` — bearing persisted as `0` and ignored by the Leaflet renderer (reserved for a future rotating-map renderer)
  - `timestamp`: ISO-8601 instant
  - `time_range`: **reserved for future use** (placeholder for an animated time-window extension; null in MVP)
  - `visible_feature_ids[]`: list of stable feature IDs that were visible at capture
  - `feature_set_hash`: hash of the sorted `visible_feature_ids` at capture time (used for stale-thumbnail detection — recomputed on plot open)
  - `thumbnail_asset_ref`: reference to a STAC asset produced by the #174 pipeline
  - `transition_duration_ms`: integer override (default = fixed constant)
  - Provenance: same shape as Storyboard

### Ordering
- Scenes sort by `timestamp` ascending. **No explicit `order` field**.
- Duplicate timestamps within a storyboard are **disallowed** — capture on an occupied timestamp prompts **Replace / Offset (+1 s) / Cancel**.
- Duplicate-scene op prompts the analyst for the new timestamp (default: source + 1 s).
- "Insert middle" is a consequence of capturing at an intermediate time.

### Feature references
- Scenes reference plot features by **stable feature ID** only. Re-imports that change IDs trigger the missing-data hard-block.

## User Interactions

### Capture
- Shortcut: `Ctrl/Cmd+Alt+C` (VS Code keybinding, scoped via `when`-clause to the Map Viewer).
- If the plot has no storyboards yet, inline quick-pick prompts for a storyboard name before the first capture.
- Thumbnail is captured via the existing #174 pipeline synchronously. **If thumbnail capture fails, the scene is not persisted** (capture aborts with an error toast).
- On collision (scene already exists at this timestamp): prompt Replace / Offset / Cancel.

### Editing
- Full edit suite: rename, markdown description, delete (with toast-undo, session-scoped), insert-middle (via timestamp-positioned capture), update-to-current (full re-snapshot), duplicate (prompted timestamp), copy-to-other-storyboard (dropdown picker, deep-copies thumbnail asset).
- No drag-reorder — reorder by editing the scene's timestamp or by update-to-current.
- All ops emit entries to the Analysis Log Panel (#176) with the scene thumbnail.

### Playback (MVP, in-VS-Code preview only)
- Forward / backward buttons in the panel + scoped `Left` / `Right` arrow keys.
- Map transitions: Leaflet `flyTo` for viewport + time-slider tween, over `transition_duration_ms`.
- Time slider scrubbable within `[scene.t, next_scene.t]` during playback; disabled at the last scene.
- **Hard-block on missing data** — if any `visible_feature_ids` are absent or the timestamp falls outside the plot's time range, block with a prompt to edit or remove the scene. Applied in both edit and briefing contexts for MVP; may relax at production maturity.

### Panel
- Hidden by default; opened via Command Palette / view menu, and auto-opens on first capture.
- Multi-storyboard dropdown in the panel header; overflow menu for create / rename / delete storyboard.
- Soft target of ≤ ~50 scenes per storyboard (documented, not enforced).

## Success Criteria

- [ ] LinkML `Storyboard` and `Scene` models exist; generated Pydantic / TS / JSON Schema round-trip per Article II adherence tests.
- [ ] `Ctrl/Cmd+Alt+C` captures a scene in the Map Viewer; first-capture flow prompts for a storyboard name.
- [ ] Default scene title is the DTG of the captured timestamp; inline-overwritable.
- [ ] Captured scenes persist as GeoJSON Features (`debrief:type: "storyboard"` / `"storyboard_scene"`) in the plot's FeatureCollection; edits mark the plot dirty and require explicit save.
- [ ] Thumbnails are produced by the #174 pipeline at capture time, stored as STAC assets; capture fails loudly if the pipeline errors.
- [ ] Scenes ordered by timestamp; duplicate timestamps prompt Replace / Offset / Cancel.
- [ ] Edit suite: rename, markdown description, soft-delete with toast-undo, insert-middle, update-to-current (full re-snapshot), duplicate (prompted timestamp), copy-to-other-storyboard (deep-copied thumbnail, dropdown destination).
- [ ] All edit operations log to the Analysis Log Panel (#176) with the scene thumbnail attached.
- [ ] Forward / backward navigation via panel buttons and scoped `Left` / `Right` keys.
- [ ] Animated `flyTo` + time tween between scenes, using `transition_duration_ms`.
- [ ] Time slider is locked to `[scene.t, next_scene.t]` during playback.
- [ ] Hard-block on missing feature IDs or out-of-range timestamps, in both edit and playback.
- [ ] Scene rectangles render on the map only when the parent storyboard is the active dropdown selection; clicking a rectangle selects the scene and animates to it.
- [ ] Parent Storyboard Feature is hidden from the map layer.
- [ ] Stale thumbnails are detected by comparing the scene's `feature_set_hash` against the current visible-feature-ID set; manual refresh action per scene.
- [ ] Multiple named storyboards per plot, switchable via panel-header dropdown.
- [ ] Full provenance (`created_by`, `created_at`, `last_modified_by`, `last_modified_at`, `history[]`) on both Storyboard and Scene features.
- [ ] `schema_version` integer carried on Storyboard Features; plot-open migration hook in place (no migrations needed at v1).
- [ ] Works fully offline.

## Constitution Check

- **Article I (offline by default)** — all capture, editing, and playback operations run locally; no network calls.
- **Article II (schema-first)** — LinkML sources added for Storyboard + Scene; adherence tests (golden fixtures + Pydantic↔JSON Schema↔TS round-trip) required before merge.
- **Article III (provenance always)** — every storyboard and scene carries author + timestamp lineage and an append-only `history[]`; every mutation emits an Analysis Log entry.
- **Article IV (services never touch UI; thick services, thin frontends)** — storyboard CRUD lives in a shared TS module at `shared/components/storyboard/`, consumed by both the VS Code extension and the web-shell. This is a deliberate departure from the Python-services pattern because storyboard data is pure GeoJSON-Feature round-tripping with no domain logic; the module has no React-only dependencies at its core (React bindings are separate). The STAC layer sees only generic features — no API changes.
- **Article V (tests required)** — unit tests for the shared module (CRUD, ordering, hash computation, collision prompts, missing-data hard-block), plus Playwright E2E for capture, edit, and preview playback.
- **Article VI (specs before code)** — this idea graduates to `/speckit.start`, producing a full `specs/NNN-storyboarding/spec.md` and plan before implementation.

## Dependencies

- **#174** — thumbnail capture pipeline (synchronous capture of map panel as PNG STAC asset; used at scene-create time and by the per-scene "refresh thumbnail" action).
- **#176** — Analysis Log Panel (destination for storyboard-operation log entries).
- **LinkML generation pipeline** (`shared/schemas/`) — required for Storyboard + Scene model generation.
- **Stable feature IDs** — scenes reference features by ID; existing plot-edit path must preserve IDs across sessions.

## Out of Scope

**Deferred to follow-up spec:**
- **Dedicated briefing renderer** — the distraction-free playback surface (web-shell route, Electron briefing app, or exported static bundle; choice deferred). MVP ships preview-only playback in the VS Code panel.
- **Animated time-range scenes** — schema reserves `time_range` but MVP captures single instants only. A future iteration will render smooth animation across a captured time window.
- **Antimeridian handling** — viewport bounds that cross ±180° longitude emit a warning and store a best-effort polygon in MVP; proper MultiPolygon splitting deferred.

**Phase 2 (explicit non-goals):**
- Mini-app export packaging with embedded data and snapshot background images.
- Storyboard sharing / real-time collaboration.
- Video export.
- Relaxed production-mode missing-data handling (currently hard-block everywhere).

## Spec-Author Defaults (non-controversial; set during `/speckit.specify`)

- DTG format: `DDHHmmZ MMM YY` (ZULU), fallback to ISO-8601 if DTG format not applicable.
- Default `transition_duration_ms`: `500`.
- Transition easing: `ease-in-out`.
- Toast-undo window: session-only.
- Duplicate-scene default timestamp offset: `+1 second`.
- Scene / storyboard IDs: ULID.
- Zoom precision: float (matches Leaflet).
- Thumbnail dimensions: inherited from #174 conventions.
- Cross-storyboard drag-reorder: not supported in MVP.

## Complexity

Medium-High. Drivers: LinkML model additions, shared TS module between two frontends, animation + scrub-window logic, missing-data hard-block across edit and playback contexts, provenance/history persistence.
