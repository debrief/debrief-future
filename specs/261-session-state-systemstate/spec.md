# Feature Specification: Retire the sidecar — all plot state lives in the FeatureCollection

**Feature Branch**: `claude/speckit-implement-261-gC93A` (active feature: `261-session-state-systemstate`)
**Backlog Item**: 249 (Tech Debt, V:5 M:3 A:3 = 11, Complexity: High)
**Created**: 2026-05-19
**Rewritten**: 2026-05-26 — scope broadened from "migrate three slices, keep the sidecar" to "retire the sidecar entirely"
**Status**: Draft
**Supersedes**: the prior `261` scope, which explicitly preserved the `.debrief-session` sidecar (former NG-001). That constraint is reversed by this rewrite — the sidecar is now removed.

## Background

A plot is materialised on disk as a STAC item directory containing today **three** files:

1. **`item.json`** — the STAC item (catalog metadata: id, bbox, datetime, asset links, thumbnails).
2. **`features.geojson`** — the GeoJSON `FeatureCollection`: the geographic features (tracks, points, annotations, storyboards) plus, since #237, a single `SystemState` Feature (`state.activestoryboard`) pinning the active Storyboard.
3. **`item.debrief-session`** — the **sidecar**: a sibling JSON file written by `services/session-state` carrying the Zustand store's `temporal`, `spatial`, and `features` slices (time window, playhead, viewport, selection, visibility, playback prefs).

The sidecar is a parallel persistence path that violates Constitution Article II.1 (single source of truth): the plot's state is split across two files, only one of which travels with the plot. Open a colleague's plot without its sidecar — email attachment, STAC catalog, git checkout, USB stick — and the analyst lands on default view/time/selection, because the portable artefact (`features.geojson`) carries none of it.

**This feature deletes the sidecar.** Every piece of state it carried is reclassified into one of three destinations:

- **Plot state** → a `SystemState` Feature inside `features.geojson`, addressed by a deterministic feature id (`state.spatial`, `state.temporal`, `state.selection`, `state.activestoryboard`). This is the #237 pattern generalised.
- **Per-feature state** → a property on the individual GeoJSON feature it concerns (visibility becomes `properties.visible`).
- **Ephemeral runtime** → not persisted at all; defaulted or recomputed on load (this is already how several fields behave).

After this work a plot is **exactly two files** — `item.json` + `features.geojson` — and the entire interactive state of the plot is reconstructable from `features.geojson` alone.

### Why this is now tractable (and why the sidecar's "per-user" justification dissolves)

The original #261 kept the sidecar on the premise that some fields (playback rate, step size, time filter, display mode) were "per-user / per-machine" and shouldn't ride with the shared plot. That premise was rejected during this rewrite's design: **all of those fields describe the data being replayed, not the user** — the playback rate and step size are properties of *this plot's* temporal extent; the time filter and display mode are *this plot's* analytical framing. They are plot attributes. With that resolved, there is no residual per-user bucket, so there is nothing the sidecar needs to hold — it can be deleted with no per-plot replacement store.

## Target architecture

```text
<store>/<catalog>/<item>/
├── item.json            # STAC item — unchanged role (catalog metadata only)
└── features.geojson     # FeatureCollection — the single source of truth for plot state
    ├── <geographic features…>            # Track / Point / Annotation / Storyboard / Scene
    │     └── properties.visible?: boolean   # NEW — per-feature visibility (absent = visible)
    ├── Feature  id="state.spatial"          # kind:SYSTEM, state_type:spatial
    ├── Feature  id="state.temporal"         # kind:SYSTEM, state_type:temporal
    ├── Feature  id="state.selection"        # kind:SYSTEM, state_type:selection
    └── Feature  id="state.activestoryboard" # kind:SYSTEM, state_type:active_storyboard (#237, unchanged shape)
```

`SystemState` features keep the shipped #237 wire shape: `geometry: { "type": "Point", "coordinates": [] }`, `properties.kind: "SYSTEM"`, a `state_type` discriminator, and an id matching `^state\.[a-z]+$`. At most one feature per `state_type` per plot. They carry **no** provenance array (see FR-013).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A plot is fully self-describing (Priority: P1)

An analyst receives a single `.plot.geojson` (the `features.geojson` asset) by email — no STAC catalog, no sidecar — opens it, and lands on the exact map view, time window, playhead, selection, and feature visibility the sender had when they saved.

**Why this priority**: This is the whole point. The portable artefact must carry the complete interactive state. It also subsumes the spatial/temporal/selection round-trip stories of the prior #261 into one outcome.

**Independent Test**: Save a plot in host A with a recognisable viewport, a scoped time window, a scrubbed playhead, two features selected, and one feature hidden. Copy ONLY `features.geojson` to host B (different machine, no catalog, no sidecar). Open it. The viewport, time window, playhead, selection, and hidden feature are all restored. Works VS Code→web-shell, web-shell→VS Code, and same-host.

**Acceptance Scenarios**:

1. **Given** a plot saved with viewport, time window, playhead, selection, and one hidden feature, **When** only `features.geojson` is opened in either host, **Then** all five are restored from the file alone.
2. **Given** the same plot, **When** the directory is inspected, **Then** there is **no** `*.debrief-session` file — the state lives in `state.*` SystemState features and per-feature `visible` flags inside `features.geojson`.
3. **Given** a plot published to a STAC catalog (sidecar would historically be stripped), **When** it is re-opened from the catalog, **Then** state is fully preserved.

---

### User Story 2 — The sidecar is gone (Priority: P1)

After this work, no host reads or writes a `.debrief-session` file, and the code paths that did are deleted.

**Why this priority**: The architectural payoff. Without removal, state would be written in *two* places — strictly worse than the status quo (duplication instead of consolidation).

**Independent Test**: `grep -r "debrief-session"` over the repo returns no runtime read/write code (only, at most, historical references in docs/ADRs). Saving a plot writes exactly `item.json` (when STAC metadata changes) and `features.geojson`; no third file appears.

**Acceptance Scenarios**:

1. **Given** a save in either host, **When** the item directory is listed, **Then** only `item.json` and `features.geojson` (and thumbnail assets) are present — never `item.debrief-session`.
2. **Given** the `services/session-state` package, **When** its persistence module is inspected, **Then** the sidecar `saveSession`/`loadSession`/`extractPersistentState`/`serializeState` file-I/O functions are gone, replaced by FeatureCollection-based hydrate/extract helpers.

---

### User Story 3 — Feature visibility is a property of the feature (Priority: P2)

Hiding or revealing a feature toggles a `visible` flag on that feature itself, so visibility travels with the feature and survives the round-trip.

**Why this priority**: P2 because it is mechanically independent of the SystemState path; it touches every feature's properties rather than a single state feature.

**Independent Test**: Hide two features, save, transfer `features.geojson`, reopen — the same two features are hidden. Inspecting the file shows `properties.visible: false` on exactly those two features and the property absent (or `true`) on the rest.

**Acceptance Scenarios**:

1. **Given** features `[A, B]` hidden, **When** the plot is reopened on another machine, **Then** `[A, B]` are hidden and all others visible.
2. **Given** a feature toggled hidden→visible→hidden, **When** the feature's provenance is inspected, **Then** the visibility changes are recorded on that feature's own provenance log (accepted log growth — see FR-014).
3. **Given** a legacy feature with no `visible` property, **When** it is loaded, **Then** it is treated as visible (absent = visible).

---

### User Story 4 — VS Code / web-shell parity through one shared writer (Priority: P1)

Both hosts read and write all `SystemState` variants through a single shared helper. #237's host-private web-shell writer is folded into it.

**Why this priority**: P1 — every other story depends on both hosts producing the same wire shape from one code path (Article II.1). VS Code today writes *no* SystemState features; web-shell writes only `active_storyboard` via a host-private module.

**Independent Test**: A `state.*` feature written by VS Code is read correctly by web-shell and vice versa, for every variant (the 4 × 2-producer × 2-reader matrix). The #237 active-storyboard regression test still passes after its writer is re-pointed at the shared helper.

**Acceptance Scenarios**:

1. **Given** a plot whose `features.geojson` was written by web-shell, **When** VS Code opens it, **Then** all SystemState variants are applied identically (and vice versa).
2. **Given** the active-storyboard pin written by the shared helper, **When** the existing #237 tests run, **Then** they pass unchanged (NG-002 — wire shape preserved).

---

### Edge Cases

- **No SystemState features (fresh or pre-this-work plot)**: load applies defaults for the missing variants — identical to today's "no sidecar" path. This is the normal state of every plot created before this work; there is no error.
- **Malformed SystemState feature** (e.g. `state_type: spatial` with no `viewport`): strict-on-import — load fails loudly with a structured error naming the offending feature id (Article XIV.4). No silent fallback.
- **Two features sharing a `state_type`**: load-time error (FR-003). At most one per `state_type`.
- **`current_time` outside `[start_time, end_time]`, or `start_time > end_time`**: load fails with `SystemStateLoadError(kind='cross-field-invariant')` (FR-011). No silent clamping.
- **Legacy sidecar present on disk**: **ignored.** No read shim (FR-016). The first save writes state into `features.geojson`; the stale sidecar, if any, is left untouched on disk and never read again (a follow-up cleanup may delete it, but reading it is explicitly not done).
- **Feature with `visible: false` then deleted**: no special handling — visibility is a property of an existing feature; deleting the feature removes its visibility with it.
- **Concurrent save from two hosts**: last-write-wins at the `features.geojson` level — same as today's plot-feature behaviour. No merge resolution introduced.

## Requirements *(mandatory)*

### Functional Requirements

#### Schema and contract

- **FR-001**: Every `SystemState` Feature MUST conform to the corresponding `SystemStateProperties` variant in `shared/schemas/src/linkml/geojson.yaml`, with `kind: "SYSTEM"`, a populated `state_type`, empty-Point geometry, and an id matching `^state\.[a-z]+$` (the deterministic ids `state.spatial` / `state.temporal` / `state.selection` / `state.activestoryboard`).
- **FR-002**: The LinkML `SystemStateProperties` class MUST be extended to carry every migrated field (see the authoritative table in "State classification"): on the **spatial** variant `viewport` (`ViewportPolygon`) and `rotation`; on the **temporal** variant `start_time`, `end_time`, `current_time`, `time_filter`, `display_mode`, `step_size`, `playback_rate`; on the **selection** variant `selected_ids` and `selected_primary`. The legacy `bbox`/`zoom`/`center` fields MUST be removed (Article XIV.1 — verified zero runtime consumers). Reuse the existing `ViewportPolygon`, `TimeFilter`, `TimeStep`, `DisplayModeEnum` definitions — do not introduce parallel shapes (Article II.1). The `SystemStateTypeEnum.spatial` permissible-value description (currently "(bbox, zoom)") MUST be updated to reflect the `viewport` shape.
- **FR-003**: A plot MUST contain at most one `SystemState` Feature per `state_type`. Two is a load-time error, not a silent reconciliation.
- **FR-004**: Per-variant required fields MUST be enforced by LinkML `rules:` blocks keyed on `state_type` (temporal ⇒ `start_time`+`end_time`; spatial ⇒ `viewport`; selection ⇒ `selected_ids`; active_storyboard ⇒ `active_storyboard_id`). `current_time`, `time_filter`, `display_mode`, `step_size`, `playback_rate`, `rotation`, `selected_primary` remain optional.
- **FR-005**: The base feature-properties class MUST gain an optional `visible: boolean`. Absent ⇒ visible; `false` ⇒ hidden. This is the schema home for per-feature visibility (replacing the sidecar's `hiddenFeatureIds`).
- **FR-006**: Golden fixtures MUST exist under `shared/schemas/fixtures/` for each `SystemState` variant (valid + invalid edge cases) AND a fixture exercising a feature with `visible: false`. Schema-adherence tests (Article II.2) MUST cover them — closing the gap that #237 left (no fixture exists today for any SystemState variant).

#### Read path (load)

- **FR-007**: Both hosts MUST read `SystemState` features from the loaded `features.geojson` and hydrate the in-memory store during plot open. Per-feature `visible` flags MUST hydrate the in-memory visibility set in the same pass.
- **FR-008**: When a variant's `SystemState` feature is absent, the corresponding store fields MUST fall back to their defaults (identical to today's no-sidecar behaviour). Absence is normal, not an error.

#### Write path (save)

- **FR-009**: On save, both hosts MUST upsert one `SystemState` feature per non-default variant into the `features.geojson` FeatureCollection (replacing any prior feature of the same `state_type`), and MUST write `properties.visible: false` onto each currently-hidden feature (omitting the property, or setting `true`, when visible).
- **FR-009a** (host save semantics): "Save" differs per host and both paths MUST funnel view-state into the FeatureCollection before it is persisted. VS Code: the explicit save command builds the SystemState write-input from the store and calls the shared writer on `mapPanel.getCurrentFeatures()` before writing `features.geojson`. Web-shell has no explicit save action — it auto-persists the FeatureCollection to its IndexedDB plot store (#236) on edit; therefore view-state changes (viewport, selection, time window/playhead, visibility) MUST be written into that FeatureCollection through the shared writer so the existing IndexedDB persistence captures them. This is what makes web-shell a *producer* in the SC-003 parity matrix; it is not free wiring.
- **FR-010**: Save MUST write exactly two files where applicable: `features.geojson` (always, when plot state changed) and `item.json` (only when STAC metadata changed). It MUST NOT write any `*.debrief-session` file.

#### Provenance

- **FR-013**: The four `state.*` view-state features carry **no** `provenance` array (lean — they are current-state markers, not analytical transformations; #237's `active_storyboard` already writes none). Visibility changes are recorded on the **affected feature's own** provenance log via the existing per-feature provenance mechanism.
- **FR-014**: The provenance growth from frequent hide/reveal toggles is accepted for this work. A separate follow-up may add provenance compaction if it proves noisy; it is out of scope here.

#### Host parity / shared writer

- **FR-015**: A single shared helper (location: `services/session-state/src/system-state/`, re-exported from `@debrief/session-state`) MUST be the sole producer/consumer of `SystemState` read/write logic for all four variants. #237's `apps/web-shell/src/services/activeStoryboardPersistence.ts` MUST be folded into it and the host-private module deleted, with call sites re-pointed. No host-private SystemState writer survives.

#### Sidecar removal (hard cut)

- **FR-016**: The sidecar is removed with **no legacy read shim**. `services/session-state` sidecar file-I/O (`saveSession`/`loadSession`/`extractPersistentState`/`serializeState` and the `SessionFile`/`SessionFileHeader`/version-migration machinery) MUST be deleted or repurposed to operate on the FeatureCollection. VS Code's `deriveSessionPath`, the `loadSession(...)` call in `openPlot.ts`, and the `saveSession(...)` call in `saveSession.ts` MUST be removed. No `.debrief-session` file is ever read after this work.
- **FR-017**: The in-memory Zustand store keeps its current shape. Only the persistence boundary changes — hydrate-from-FeatureCollection on load, extract-to-FeatureCollection on save.

#### Strict on import + cross-field invariants

- **FR-011**: The shared helper's load validator MUST reject a `temporal` feature whose `current_time` (when present) lies outside `[start_time, end_time]`, or whose `start_time > end_time`, with `SystemStateLoadError(kind='cross-field-invariant')` carrying the offending feature id and the violated invariant. No silent clamping.
- **FR-012**: Malformed SystemState features (wrong/missing discriminator, unknown `state_type`, variant-required field absent) MUST fail load loudly with a structured error (Article XIV.4) — never a tolerant fallback. (Absence of a feature is distinct and handled by FR-008.)

#### Ephemeral fields

- **FR-018**: The following fields are NOT persisted and MUST default/recompute on load: `playbackState` (→ `stopped`), `drawingMode` (→ `null`), `drawingPaletteIndex` (→ `0`), `viewportLocked` (→ `false`, per spec 260 force-unlock), `styleVersion` (→ `0`), `selection.timestamp` (regenerated), and `featureCollectionUri` (derived from the plot's own URI at load — a self-reference with no value in the file).

### Save atomicity (simplified vs prior #261)

With the sidecar gone, all migrated state rides in the single `features.geojson` write. The dual-write (FC↔sidecar) silent-failure class that prior-#261's FR-019 guarded against **no longer exists**. Save remains subject to the broader multi-asset atomicity tech-debt item (#268 — `features.geojson` vs thumbnails vs `item.json`), which is explicitly out of scope here.

## State classification *(authoritative)*

Every field the sidecar persisted today, and its new home. This table is binding; deviation requires a spec amendment.

| Store field (in-memory) | Today | New home | Verdict |
|---|---|---|---|
| `temporal.timeRange.{start,end}` (epoch) | sidecar | `state.temporal.{start_time,end_time}` (ISO) | **Plot state** |
| `temporal.currentTime` (epoch \| null) | sidecar | `state.temporal.current_time` (ISO) | **Plot state** |
| `temporal.timeFilter` | sidecar | `state.temporal.time_filter` | **Plot state** (relates to the data being replayed) |
| `temporal.displayMode` | sidecar | `state.temporal.display_mode` | **Plot state** (plot-specific) |
| `temporal.stepSize` | sidecar | `state.temporal.step_size` | **Plot state** (relates to the data being replayed) |
| `temporal.playbackRate` | sidecar | `state.temporal.playback_rate` | **Plot state** (relates to the data being replayed) |
| `spatial.viewport` | sidecar | `state.spatial.viewport` (identity) | **Plot state** |
| `spatial.rotation` | sidecar | `state.spatial.rotation` | **Plot state** |
| `features.selection.featureIds` | sidecar | `state.selection.selected_ids` | **Plot state** |
| `features.selection.primary` | sidecar | `state.selection.selected_primary` | **Plot state** |
| `features.hiddenFeatureIds` | sidecar | per-feature `properties.visible: false` | **Per-feature** |
| `features.featureCollectionUri` | sidecar | — | **Eliminated** (self-reference, derived at load) |
| `temporal.playbackState` | ephemeral | — | **Ephemeral** (→ `stopped`) |
| `spatial.drawingMode` | ephemeral | — | **Ephemeral** (→ `null`) |
| `spatial.drawingPaletteIndex` | ephemeral | — | **Ephemeral** (→ `0`) |
| `spatial.viewportLocked` | ephemeral | — | **Ephemeral** (→ `false`) |
| `features.styleVersion` | ephemeral | — | **Ephemeral** (→ `0`) |
| `features.selection.timestamp` | (in object) | — | **Ephemeral** (regenerated) |

**Type conversions** (not pure identity, contrary to a naïve reading): temporal fields are **epoch numbers** in the store but **ISO-8601 strings** in the schema (`epochToISO`/`isoToEpoch` helpers exist); `selection` is a `FeatureSelection` object in the store, of which only `featureIds` (→ `selected_ids`) and `primary` (→ `selected_primary`) migrate.

## Key Entities

- **`SystemState` Feature** — GeoJSON Feature in `features.geojson`; `properties` conform to a `SystemStateProperties` variant; deterministic id `state.<type>`; empty-Point geometry; no provenance.
- **Per-feature `visible`** — optional boolean on the base feature-properties class; absent ⇒ visible.
- **Shared SystemState helper** — pure transformation layer (`read`/`write`/`mapping`/`validate`) in `services/session-state/`; sole producer/consumer of SystemState logic across hosts.
- **Zustand store** — unchanged in shape; gains FeatureCollection-based hydrate/extract at its persistence boundary in place of sidecar I/O.

## Success Criteria *(mandatory)*

- **SC-001**: A plot's full interactive state (viewport, rotation, time window, playhead, time filter, display mode, step size, playback rate, selection, per-feature visibility) round-trips through `features.geojson` ALONE — save in host A, transfer only `features.geojson`, open in host B — in both directions, within float-round-trip tolerance (≤ 1e-9 relative) for numerics and ISO-second precision for timestamps.
- **SC-002**: After a save, the item directory contains exactly `item.json` + `features.geojson` (+ thumbnail assets) and **no** `*.debrief-session` file. A repo grep finds no runtime sidecar read/write code.
- **SC-003**: Host cross-product parity: every `SystemState` variant written by every host is read correctly by every host (4 variants × 2 producers × 2 readers).
- **SC-004**: Per-feature visibility round-trips: hidden features remain hidden across a `features.geojson`-only transfer; the file shows `visible: false` on exactly the hidden features.
- **SC-005**: The schema-adherence suite covers all four `SystemState` variants (valid + invalid) plus a `visible: false` feature — 0 fixtures today → full coverage after (Article II.2, gating per Article VI.1).
- **SC-006**: Strict-on-import: malformed SystemState features and cross-field-invariant violations fail load with structured errors naming the offending feature id; no silent fallback or clamping.
- **SC-007** (Article II.1): the number of distinct SystemState write code paths is **one** (the shared helper, both hosts, all four variants) — down from today's split (web-shell host-private `active_storyboard` writer + VS Code writes nothing), and the number of per-plot persistence files is **two** (down from three).
- **SC-008** (Article VII): schema fixtures + round-trip tests for each variant exist and pass **before** the runtime migration merges.

### Non-goals (explicit)

- **NG-001**: Does NOT add a per-user / per-machine persistence layer. With all fields classified as plot-state, per-feature, or ephemeral, there is no per-user bucket. (Reverses the prior #261's sidecar-retention non-goal of the same number — this is the intended supersede.)
- **NG-002**: Does NOT change the on-the-wire shape of #237's `active_storyboard` feature — only its writer location (host-private → shared helper).
- **NG-003**: Does NOT add provenance compaction for the per-feature visibility log (FR-014 accepts the growth; compaction is a follow-up).
- **NG-004**: Does NOT make the broader VS Code multi-asset save transactional (`features.geojson` vs thumbnails vs `item.json`) — that is #268.
- **NG-005**: Does NOT change the save-vs-dirty UX contract. Scrubbing the playhead does not mark the plot dirty; state is persisted only on explicit save.
- **NG-006**: Does NOT introduce a tolerant import path for out-of-window `current_time` — that is #267 (revisited only if strict-on-import proves user-hostile).

## Dependencies

- **Hard**: #237's runtime (shipped) — extended, not revisited. The LinkML codegen pipeline (verified healthy — clean regen, zero drift).
- **Supersedes**: prior #261 scope (sidecar retention). Reuses its designed machinery (LinkML delta, shared helper, fixtures) wholesale.
- **Closes / narrows**: #250 (web-shell session-state parity) — substantially narrowed, NOT free. This work delivers web-shell's read-hydration and the write-into-FeatureCollection path (FR-009a), so all *plot* state reaches parity. #250's genuine residual is the web-shell save-trigger UX question (when/whether to auto-commit a viewport nudge vs. debounce vs. require an explicit gesture) — a UX decision, not a persistence-mechanism gap. #251 (per-user persistence) — rendered moot by the all-plot-state classification (revisit only if a real per-user need emerges).
- **Schedules follow-ups**: #266 (purge stale `bbox`/`center` references in docs/ADRs), #267 (out-of-window policy), #268 (broader save atomicity).

## Downstream regeneration note

This rewrite invalidates the prior `plan.md`, `tasks.md`, `research.md`, `data-model.md`, and `contracts/` for #261 (they assumed sidecar retention). They MUST be regenerated via `/speckit.plan` → `/speckit.tasks` against this spec before implementation resumes.
