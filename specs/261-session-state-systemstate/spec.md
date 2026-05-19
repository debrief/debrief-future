# Feature Specification: Migrate session-state slices into in-plot SystemState features

**Feature Branch**: `claude/start-speckit-249-wFYtR` (active feature: `261-session-state-systemstate`)
**Backlog Item**: 249 (Tech Debt, V:5 M:3 A:3 = 11, Complexity: High)
**Created**: 2026-05-19
**Status**: Draft
**Input**: User description: "Unify `@debrief/session-state` (temporal / spatial / selection) with the in-plot `SystemState` Feature pattern — once #237 lands the first runtime consumer of `SystemState` (the `active_storyboard` variant), retroactively migrate the existing `temporal` / `spatial` / `selection` slices currently stored in the `.debrief-session` sidecar so they too live as `SystemState` features inside the plot's FeatureCollection."

## Background

Today, two parallel persistence paths carry plot state across sessions:

1. **The plot file** (`*.plot.geojson` — a GeoJSON FeatureCollection). Holds geographic features and, since #237 shipped runtime in web-shell, a single `SystemState` Feature with `state_type: "active_storyboard"` that pins the active Storyboard for a plot.
2. **The sidecar** (`*.debrief-session` — sibling JSON file). Holds the Zustand session-state slices: `temporal`, `spatial`, and a `features` slice that carries the `selection` set among other things.

The LinkML master schema (`shared/schemas/src/linkml/geojson.yaml` lines 613–681) already models all four `SystemStateProperties` variants: `active_storyboard`, `temporal`, `spatial`, and `selection`. But only `active_storyboard` has a runtime consumer (web-shell only, via `apps/web-shell/src/services/activeStoryboardPersistence.ts`). VS Code currently produces neither the `active_storyboard` SystemState feature nor any of the other three variants. The other three slices live entirely in the sidecar.

This is a documented contract with zero runtime producers for three of its four variants. The schema mandates the destination; the runtime ignores it. Constitution Article II.1 (single source of truth) and Article IV.4 (writer as the sole persistence boundary) are both implicitly violated.

This feature migrates the slices the schema already covers — `temporal`, `spatial`, `selection` — into the plot file as `SystemState` Features, extending the #237 precedent. It is **explicitly NOT a wholesale sidecar retirement**: fields outside the schema's variants (playback state, drawing mode, viewport lock) remain in the sidecar pending a separate per-user-state decision (constraint from approval: see #251).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Cross-machine spatial viewport restoration (Priority: P1)

An analyst opens a colleague's plot and lands on the same map view (bbox, zoom, centre) the colleague was looking at when they saved.

Today, opening a plot on a different machine — or with the sidecar missing, lost, gitignored, or stripped during export — drops the analyst at the default global view. The plot itself carries no spatial-viewport hint. After this work, the spatial viewport rides inside the plot's FeatureCollection as a `SystemState` Feature with `state_type: "spatial"`, so it travels with the plot wherever the plot goes (email attachment, STAC catalog, git repository, USB stick).

**Why this priority**: This is the **uncontroversial slice** identified during approval ("likely `spatial` bbox"). Spatial viewport is intrinsically about *the plot* — there is no reasonable per-user interpretation of "the bbox the plot was last saved with". It establishes the migration pattern with the lowest semantic risk.

**Independent Test**: Save a plot in one host with a recognisable bbox, transfer ONLY the `.plot.geojson` file (not the sidecar) to a second host, open it. The map opens at the saved bbox/zoom/centre, not the default global view. The same test works VS Code→web-shell, web-shell→VS Code, and same-host across sessions with the sidecar deleted.

**Acceptance Scenarios**:

1. **Given** a plot saved with spatial viewport bbox=[−10, 50, 10, 60], **When** the plot file (without sidecar) is opened in either host, **Then** the map opens at bbox=[−10, 50, 10, 60].
2. **Given** a plot whose FeatureCollection contains both a `SystemState`/`spatial` feature AND a sidecar with a different bbox, **When** the plot is opened, **Then** the in-plot `SystemState` value wins (see FR-007 reconciliation rule).
3. **Given** an export pipeline that strips the sidecar (e.g. publishing to STAC), **When** the plot is re-opened from STAC, **Then** spatial viewport is preserved.

---

### User Story 2 — Cross-machine temporal viewport restoration (Priority: P2)

An analyst opens a colleague's plot and lands on the same temporal viewport (the time window the colleague had scoped) the colleague was looking at when they saved.

**Why this priority**: Conceptually identical to Story 1 but **semantically more contested**. The temporal viewport can plausibly be argued either way: "the analytical window for this plot" (shared, per-plot) vs. "what I happened to be looking at" (per-user, per-machine). The approval explicitly flagged that "temporal viewport and selection may want to stay per-user (see #251)". P2 because it carries Story 1's machinery but defers the question of which *additional* fields beyond `start_time`/`end_time` (the only two the schema models for the temporal variant) come along.

**Independent Test**: Same shape as Story 1 but with temporal viewport — save with a specific [start, end] window in one host, transfer plot file only, open in the other host, time slider lands on the saved window.

**Acceptance Scenarios**:

1. **Given** a plot saved with temporal viewport [2024-01-01T00:00Z, 2024-01-07T00:00Z], **When** the plot file (without sidecar) is opened in either host, **Then** the time scope renders that window.
2. **Given** the analyst then changes time scope locally (e.g. zooms in on a 1-hour incident), **When** the plot is closed without saving, **Then** the in-plot SystemState value is unchanged — local exploration does not mutate the shared temporal viewport.
3. **Given** the analyst saves after changing the time scope, **Then** the in-plot SystemState value is updated to reflect the new window.

---

### User Story 3 — Cross-machine selection restoration (Priority: P3)

An analyst opens a colleague's plot and finds the same set of features pre-selected.

**Why this priority**: Most semantically contested. Per #251, selection is the strongest candidate to remain per-user — analyst A pre-selecting "the four hostile contacts" while analyst B is investigating "the friendly convoy" is normal collaborative-but-divergent work. P3 because it carries the most risk of being the wrong default. **Deferral is acceptable** per approval constraint #2 — this story may be scoped out entirely if the team confirms per-user semantics is the answer.

**Independent Test**: As Story 1, but verifying that `selected_ids` survive the round-trip via the plot file.

**Acceptance Scenarios**:

1. **Given** an analyst saves with feature IDs `[feat-a, feat-b]` selected, **When** the plot is opened on a different machine, **Then** those two features are pre-selected.
2. **Given** the team has decided selection should be per-user (Resolution of [NEEDS CLARIFICATION 1] below), **Then** this story is removed and the `selection` variant remains documented-but-unused in the schema, with selection continuing to live in the sidecar.

---

### User Story 4 — VS Code parity with the web-shell `active_storyboard` writer (Priority: P1)

VS Code can read AND write `SystemState` features in the plot, matching the read/write surface web-shell gained when #237 shipped.

**Why this priority**: P1 because every other story above depends on it. Without a VS Code `SystemState` writer, cross-host parity is impossible — VS Code users would silently lose any in-plot SystemState their colleagues set. This story is the "extend the #237 pattern to VS Code" precondition.

**Independent Test**: In VS Code, open a plot containing a `SystemState`/`active_storyboard` feature written by web-shell; verify the active-storyboard pin is honoured. Then change the pin in VS Code, save, and open the plot in web-shell; verify the new pin is honoured.

**Acceptance Scenarios**:

1. **Given** a plot written by web-shell containing `SystemState`/`active_storyboard`, **When** VS Code opens it, **Then** the same active-storyboard pin is applied (round-trip parity with #237).
2. **Given** VS Code writes any of the four `SystemState` variants (`active_storyboard`, `temporal`, `spatial`, `selection`), **When** web-shell opens the plot, **Then** the value is read and applied consistently.

---

### User Story 5 — Sidecar shrinkage (Priority: P2)

After this work, the `.debrief-session` sidecar file is **smaller** — it no longer carries fields that have been migrated to the plot. It is NOT retired (per approval constraint #3) — it continues to exist for non-migrated fields (playback state, drawing mode, viewport lock, etc.) and for any fields the team explicitly chooses to keep per-user (e.g. selection if deferred via Story 3 / #251).

**Why this priority**: This is the architectural payoff. Without measurable sidecar shrinkage, the migration has happened in name only — it would mean writing the data in *both* places, which is worse than the status quo (duplication instead of single source). P2 because Story 1 (the user-visible value) is more important to validate first.

**Independent Test**: Save a plot before and after the migration; the `.debrief-session` JSON for the after-case omits at minimum the fields covered by the migrated variants (`bbox`, `zoom`, `center` for spatial; `start_time`, `end_time` for temporal; `selected_ids` for selection if Story 3 ships). The omitted keys instead appear inside `SystemState` Features in the plot file's FeatureCollection.

**Acceptance Scenarios**:

1. **Given** a plot saved post-migration with spatial migrated, **When** the `.debrief-session` JSON is inspected, **Then** keys `bbox`, `zoom`, `center` are absent from the `spatial` slice (the slice may still exist for non-migrated fields like `viewportLocked`, `drawingMode`, etc.).
2. **Given** a plot saved post-migration, **When** the `.plot.geojson` FeatureCollection is inspected, **Then** the migrated fields appear inside one `SystemState` Feature per migrated variant.

---

### Edge Cases

- **Both sources present, values agree**: Plot has `SystemState`/`spatial` feature AND sidecar has `bbox` — both values match. Trivially resolved.
- **Both sources present, values disagree**: Plot has `SystemState`/`spatial` feature AND sidecar has `bbox` — values differ. Must have a reconciliation rule (see FR-007).
- **Only sidecar (legacy plot)**: Plot file pre-dates the migration; no `SystemState` features exist for the migrated variants. Sidecar values are used; on next save, values are written into both new (`SystemState`) and old (sidecar — for non-migrated fields) homes.
- **Only plot (sidecar deleted, missing, or never created — e.g. web-shell today)**: Plot has `SystemState` features for migrated variants; no sidecar exists. Migrated fields load from plot; non-migrated fields use defaults. (This is the new web-shell baseline post-migration, which incidentally narrows the scope of #250.)
- **Schema variant has fewer fields than sidecar slice**: E.g. sidecar `spatial.viewportLocked` has no home in the schema's `spatial` variant. **This field stays in the sidecar.** Migration is per-field, not per-slice (see FR-006).
- **Concurrent save from two hosts**: Two analysts open the same plot, change spatial viewport differently, save. Last-write-wins at the file level — same as today's plot-feature behaviour, no new contract introduced. Out of scope to add merge resolution.
- **SystemState feature missing required schema fields**: Plot file contains a malformed `SystemState` feature (e.g. `state_type: "spatial"` but missing `bbox`). Strict schema validation rejects the feature; load proceeds with sidecar fallback for that variant.
- **Multiple SystemState features of the same variant**: Plot file contains two `SystemState` features with `state_type: "spatial"`. Schema and runtime contract is "at most one per variant per plot". Detection: load fails with a clear error pointing at the offending feature IDs. Out of scope to auto-merge.
- **Schema fixture coverage gap**: No golden fixtures exist today for ANY `SystemState` variant (not even `active_storyboard` — see Findings §6). This feature adds them as part of Story 1 → Story 4 delivery, so the schema-adherence test gate (Constitution Article VI.1) actually exercises these variants.

## Requirements *(mandatory)*

### Functional Requirements

#### Schema and contract

- **FR-001**: Every `SystemState` Feature written to a plot's FeatureCollection MUST conform to the corresponding LinkML `SystemStateProperties` variant (`temporal`, `spatial`, `selection`, or `active_storyboard`) defined in `shared/schemas/src/linkml/geojson.yaml`, with `kind: "SYSTEM"` and a populated `state_type` discriminator.
- **FR-002**: Golden fixture coverage MUST exist under `shared/schemas/fixtures/` for each migrated `SystemState` variant (both valid examples and invalid edge cases per existing fixture conventions) AND for the already-shipped `active_storyboard` variant (currently no fixture exists for it — gap inherited from #237).
- **FR-003**: A plot MUST contain at most one `SystemState` Feature per `state_type` value. Two features sharing a `state_type` is a load-time error, not a silent reconciliation.

#### Read path (load)

- **FR-004**: Both hosts (VS Code, web-shell) MUST read `SystemState` Features from the plot's FeatureCollection during plot load and apply migrated fields to the in-memory session-state store, **before** the legacy sidecar load step.
- **FR-005**: When a plot contains a `SystemState` Feature for a migrated variant, the migrated fields MUST be applied from the plot. When the plot contains no such feature, the sidecar continues to be the source for those fields (backward compatibility with pre-migration plots).
- **FR-006**: Per-field migration: each migrated field MUST be enumerated and recorded in a migration scope table (see "Per-slice migration scope" section below). Fields outside the scope MUST continue to load from and save to the sidecar — the sidecar is NOT retired.
- **FR-007**: Reconciliation rule when both sources disagree: **the in-plot `SystemState` Feature wins** for migrated fields. The sidecar value for that field is discarded on load and overwritten on next save. (Default selected on the principle that the plot file is the canonical, portable artefact; the sidecar is a host-local cache.)

#### Write path (save)

- **FR-008**: On save, both hosts MUST write a `SystemState` Feature per migrated variant containing exactly the migrated fields for that variant, replacing any prior feature of the same `state_type`.
- **FR-009**: On save, both hosts MUST omit migrated fields from the sidecar (the sidecar continues to exist for non-migrated fields; only the migrated keys are dropped from it).
- **FR-010**: Every `SystemState` Feature write MUST record provenance via the `provenance` `LogEntry` array on `SystemStateProperties` (Constitution Article III.1: provenance always). The provenance entry MUST identify the producing host (VS Code / web-shell) and the save action.

#### Host parity

- **FR-011**: VS Code MUST gain a `SystemState` read/write surface mirroring the web-shell `activeStoryboardPersistence.ts` pattern, structured so all four variants (the three migrated by this work plus `active_storyboard`) are served by a single shared helper, not duplicated per host.
- **FR-012**: The shared helper MUST live in a location consumable by both hosts (e.g. `services/session-state/` or a sibling module) — no host-private SystemState writer. (Implementation detail deferred to planning, but the *constraint* — single producer of the SystemState write code path — is binding here.)

#### Migration scope (the open question)

- **FR-013**: The exact set of fields migrated per variant MUST be enumerated explicitly. See "Per-slice migration scope" section below for the decision matrix and the [NEEDS CLARIFICATION] resolution.

#### Backwards compatibility

- **FR-014**: Plots saved before this migration (sidecar-only, no `SystemState` Features for migrated variants) MUST continue to load correctly. On next save they are upgraded — the new fields appear in `SystemState` Features and are dropped from the sidecar.
- **FR-015**: The session-state schema version (`SessionFile.version` in the sidecar JSON header) MUST be bumped (semver minor — additive change, no breaking removal) so existing fixtures and migration tooling can detect pre-migration vs post-migration sidecars.

### Key Entities

- **`SystemState` Feature**: GeoJSON Feature inside a plot's FeatureCollection. Properties conform to `SystemStateProperties` LinkML class. Discriminated by `state_type` (one of `temporal`, `spatial`, `selection`, `active_storyboard`). At most one per `state_type` per plot. Carries provenance.
- **`.debrief-session` sidecar**: Per-plot JSON sibling file (`foo.plot.geojson` ↔ `foo.debrief-session`). Continues to exist post-migration for fields **not** covered by `SystemStateProperties` variants (e.g. `playbackState`, `viewportLocked`, `drawingMode`). Sidecar header carries a version bump to mark the migrated era.
- **Migrated fields set**: The explicit list of `{slice, field-name}` pairs that move from sidecar to plot. Closed set, defined in "Per-slice migration scope" below.
- **Session-state Zustand store**: The in-memory representation in `services/session-state/`. Unchanged in shape — its `loadSession` and `saveSession` boundaries gain the new responsibility of reading/writing `SystemState` Features alongside the sidecar.

## Per-slice migration scope

Approval constraint #2 ("per-user vs. shared semantics is open") requires this section to enumerate each slice and either justify shared semantics or scope it out.

### Inherited decisions from #237 (`active_storyboard`)

The `active_storyboard` variant has already shipped runtime in web-shell. This work treats #237's choices as authoritative:

| Decision | #237's resolution | This work's posture |
|---|---|---|
| Where does the field live? | Inside the plot's FeatureCollection as a `SystemState` Feature with `state_type: "active_storyboard"`. | Inherit. The three new variants follow the same placement. |
| Per-plot or per-user? | Per-plot, shared across analysts. ("any analyst opening the plot lands on the most-recently-pinned Storyboard") | Inherit the *pattern* (per-plot, shared) as the default; deviate only with explicit per-slice justification (see below). |
| Default fallback when feature absent? | Default-fallback rule remains (no SystemState entry → use platform default). | Inherit. Pre-migration plots and freshly-created plots have no SystemState features for the migrated variants and load as if sidecar / defaults applied. |
| Writer location? | `apps/web-shell/src/services/activeStoryboardPersistence.ts` (host-private — predates FR-011). | **Deviate.** FR-011/FR-012 require a single shared writer for all four variants; #237's host-private code MUST be migrated to the shared helper as part of this work (otherwise the four variants diverge into two code paths). |

### Per-variant scope decisions

| Variant | Schema fields | Sidecar fields today | Migration verdict | Reason |
|---|---|---|---|---|
| **`spatial`** | `bbox`, `zoom`, `center` | `viewport` (≈ bbox + zoom + center), `rotation`, `drawingMode`, `drawingPaletteIndex`, `viewportLocked` | **Migrate** `bbox`, `zoom`, `center`. **Keep in sidecar** `rotation`, `drawingMode`, `drawingPaletteIndex`, `viewportLocked`. | Plot-shared semantics uncontroversial for the viewport itself (this is the slice the approval flagged as "likely uncontroversial"). The other fields are editor / UI state with no schema home — keep per-user. |
| **`temporal`** | `start_time`, `end_time` | `currentTime`, `timeRange`, `timeFilter`, `stepSize`, `playbackRate`, `playbackState`, `displayMode` | **Migrate** `timeRange` → `{start_time, end_time}`. **Keep in sidecar** the playback-state fields (`currentTime`, `playbackState`, `playbackRate`, `stepSize`, `displayMode`, `timeFilter`). | The *analytical window* (`start_time`/`end_time`) is plot-shared — it answers "what time range is this plot about?". Playback-control fields are per-user (where am I scrubbed to right now, am I playing, at what speed) — they have no schema home and shouldn't acquire one. |
| **`selection`** | `selected_ids` | `selection` (selected feature IDs), plus sidecar carries `hiddenFeatureIds`, `styleVersion`, `featureCollectionUri` on the same `features` slice | **[NEEDS CLARIFICATION 1]** — see below. Default: scope OUT pending #251. | Per #251, selection is the strongest candidate for per-user persistence. Reasonable arguments both ways (see [NEEDS CLARIFICATION 1]). |

### [NEEDS CLARIFICATION 1] — Selection slice migration

**Context**: Approval constraint #2 explicitly says "It is acceptable to migrate only the slice(s) where shared semantics is uncontroversial (likely `spatial` bbox) and defer the others." #251 (Per-user-within-shared-plot active-Storyboard view memory) flags that selection state may want to be per-user.

**Question**: Should the `selection` variant ship in *this* feature, or be deferred until the per-user-identity model (#221) lands and a per-user-selection model (#251 generalisation) is designed?

| Option | Resolution | Implications |
|---|---|---|
| A | **Defer**. Story 3 is removed. `selection` schema variant remains modelled but unproduced. Sidecar continues to carry `selection`. | Lowest risk. Matches the explicit approval guidance. Closes the spec scope tightly. Future #251 work is unconstrained. |
| B | **Ship as plot-shared**. Story 3 is in scope. `selected_ids` is migrated to a `SystemState`/`selection` feature. | Maximises the "single source of truth" payoff. But locks in plot-shared semantics for selection — future #251 work then has to either revert this or layer per-user-selection on top. |
| C | **Ship as plot-shared with a documented "intent to override per-user later"**. Migrate now, but document in the spec that #251 will introduce a per-user layer (probably via a new variant or per-user property on the existing variant). | Compromise. Gives the architectural payoff today but signals expected churn. |

**Default if not resolved**: Option A (defer), matching approval constraint #2's explicit acceptance.

### [NEEDS CLARIFICATION 2] — Temporal viewport: `timeRange` only, or `currentTime` too?

**Context**: The schema's `temporal` variant has exactly two fields: `start_time` and `end_time`. The sidecar `temporal` slice has both a `timeRange` (the analytical window — clearly maps to start/end) AND a `currentTime` (where the time-cursor is right now). One is naturally plot-shared, one is naturally per-user — but a user could plausibly argue both ways for `currentTime`.

**Question**: Does `currentTime` (the playhead position) ride with the plot, or stay per-user?

| Option | Resolution | Implications |
|---|---|---|
| A | **Per-user**. `currentTime` stays in sidecar. Plot-shared temporal variant carries `start_time`/`end_time` only. | Matches the natural intuition that "where I'm scrubbed to" is local exploration. Matches the schema as written. Story 2 acceptance scenarios stand as drafted (changing playhead locally doesn't dirty the plot). |
| B | **Plot-shared**. Schema must grow a `current_time` field on the `temporal` variant. `currentTime` migrates to plot. | Allows colleagues to "land where the saver was scrubbed". Requires schema breaking-or-additive change (LinkML edit + regen). Forces a "dirty on scrub" UX decision (does scrubbing mark the plot as modified?). |
| C | **Plot-shared but optional**. Schema grows an optional `current_time`. Hosts write it on save IF user explicitly requests it (e.g. via a "Save view" command). | Most flexible. Adds UX complexity (a new user-facing command). |

**Default if not resolved**: Option A. Matches the schema as it stands, matches the natural "per-user playhead" intuition, doesn't require schema changes.

### Out of scope

- **Sidecar retirement**: Approval constraint #3 — treated as a separate decision gated on (a) all three slices being migrated AND (b) confirmation that no truly per-user / per-machine concerns remain. Neither condition is satisfied by this work (the non-migrated fields enumerated in the matrix above are explicit per-machine concerns), so the sidecar continues to exist. A follow-up backlog item should be filed if/when sidecar retirement becomes viable.
- **Per-user-within-shared-plot persistence model** (#251). This work assumes plot-shared semantics for migrated fields. If #251 introduces a per-user override mechanism, it will layer on top of (not replace) what this work ships.
- **Per-actor `LogEntry.agent` identity** (#221). This work uses whatever `agent` value the current `LogEntry` infrastructure produces. If #221 changes that contract, this work inherits the change.
- **Web-shell `loadSession`/`saveSession` parity** (#250). See "Cross-reference with #250" section below — this work narrows but does not subsume #250.

## Cross-reference with #250 (web-shell session-state parity)

Approval constraint #4 asks: should #250 (web-shell `loadSession`/`saveSession`) land before, after, or in parallel with this work?

**Recommendation: this work lands FIRST, narrowing #250's scope.**

Rationale: today web-shell has zero session-state persistence (#250's scope is "build the whole thing"). After this work, all four `SystemState` variants — including the migrated ones — will load and save **via the plot file**, which web-shell already reads and writes. The remaining gap (`#250 minus this`) is the **per-user / per-machine fields that stay in the sidecar**: playback state, drawing mode, viewport lock, time playhead, etc. For web-shell, those need a different persistence backend (localStorage / IndexedDB — there's no filesystem sibling-file equivalent in a browser tab) and a different scope decision (does web-shell even *need* persistent per-user playback state?).

By landing this work first:

1. The "easy" half of #250 (the plot-shared half) is delivered as a side effect, with no web-shell-specific work needed beyond FR-011 / FR-012's shared helper.
2. #250 is reduced to a focused decision: "what per-user state does web-shell need to remember, and where?"
3. Avoids speculative web-shell sidecar work that would be invalidated by this migration.

This recommendation is non-binding on #250 — that spec retains its own scoping authority. But this spec's planning phase should produce input to #250's spec author flagging the reduced surface area.

## Assumptions

1. **#237's pattern is correct and stable**. We are extending it, not revisiting it. (#237 spec is currently `Draft` but its runtime is shipped — its actual contract is whatever `activeStoryboardPersistence.ts` does today, not whatever the eventual #237 spec text says. If #237's spec lands with revisions, those revisions must be reconciled before this work merges.)
2. **The LinkML schema is authoritative**. The variant field lists (`bbox`/`zoom`/`center` for spatial, `start_time`/`end_time` for temporal, `selected_ids` for selection) are the migration target shape. If a migrated field has no schema home, it stays in the sidecar — we do NOT extend the schema in this work unless [NEEDS CLARIFICATION 2] Option B/C is selected.
3. **Existing tests cover the non-migration path**. Loading a pre-migration plot (no `SystemState` features for the new variants) must continue to work; this is verified by re-running the existing `services/session-state/` test suite without modification.
4. **Schema fixture work is in scope**. Golden fixtures for the three migrated variants are part of this delivery (FR-002). Additionally, the missing `active_storyboard` fixture is added (it was missed by #237's delivery).
5. **No browser-storage adapter work is needed**. For web-shell, the migration moves state from "would-be-sidecar (which doesn't exist)" to "in the plot" — no localStorage/IndexedDB write surface is introduced. (Per-user fields remain unpersisted in web-shell today — that's #250's problem.)
6. **Schema version bump is additive**. Sidecar `SessionFile.version` goes from current value to next minor (e.g. `1.1.0` → `1.2.0`); the additive nature means old sidecars still load (older readers ignore unknown fields, newer readers don't see the removed fields and fall back to the plot — see FR-014).
7. **The migration is per-field, not per-slice, atomic per save**. Each save writes the full current state — no partial migrations within a single save action.

## Dependencies

- **Hard dependency on #237's runtime**. Already shipped in web-shell. Must remain stable for the duration of this work.
- **Hard dependency on LinkML codegen pipeline**. Generated TypeScript types must include `SystemStateProperties` variants (already verified — `shared/schemas/src/generated/typescript/types.ts` lines 1077–1098).
- **Soft dependency on #215 (storyboarding schema CRUD core)**. Complete; provides the `SystemState` Feature pattern this work consumes.
- **Soft cross-reference to #250, #251, #221** as discussed above. No hard ordering; this work can ship without any of them.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** (Story 1 — primary): Spatial viewport is preserved across a "save plot on host A → transfer ONLY `.plot.geojson` (no sidecar) → open on host B" round trip, in both directions (VS Code → web-shell, web-shell → VS Code). Bbox/zoom/centre match within numerical tolerance of float-round-trip (≤ 1e-9 relative error on numeric fields).
- **SC-002** (Story 2): Temporal viewport (`start_time`, `end_time`) is preserved across the same round-trip in both directions. Timestamps match to ISO-8601 second precision.
- **SC-003** (Story 4 — host parity): VS Code can read AND write all four `SystemState` variants (including `active_storyboard`, fixing the asymmetry where web-shell-only writes `active_storyboard` today). Verified by a host-cross-product test matrix: every variant written by every host is read correctly by every host (4 variants × 2 producers × 2 readers = 16 test cases, including the diagonal).
- **SC-004** (sidecar shrinkage — Story 5): Post-migration sidecar files for newly-saved plots are missing **all** of the keys enumerated in the migration-scope matrix. Verified by a golden-fixture comparison: pre-migration sidecar JSON vs. post-migration sidecar JSON shows exactly the documented field set has moved.
- **SC-005** (backward compatibility — FR-014): 100% of existing pre-migration plot+sidecar fixtures continue to load and produce the same in-memory session-state as before. Re-running the existing `services/session-state/` test suite passes unchanged.
- **SC-006** (schema coverage — FR-002): The LinkML schema adherence test suite covers all four `SystemState` variants with both valid and invalid fixtures. Test coverage gap closed (today: 0 of 4 variants have fixtures; after: 4 of 4).
- **SC-007** (architectural payoff — Constitution Article II.1): The number of distinct write code paths producing `SystemState` Features goes from 1 (web-shell-only, for `active_storyboard`) to 1 (shared helper, for all four variants on both hosts). I.e. no new divergence is introduced, and the existing divergence between "web-shell writes a SystemState" and "VS Code writes nothing" is resolved.
- **SC-008** (test-driven gate — Constitution Article VII): Schema golden fixtures and round-trip tests for each migrated variant exist and pass **before** the runtime migration is merged.

### Non-goals (explicit)

- **NG-001**: This work does NOT retire the `.debrief-session` sidecar.
- **NG-002**: This work does NOT introduce a per-user persistence layer for any variant. All migrated fields are plot-shared.
- **NG-003**: This work does NOT extend the LinkML `SystemStateProperties` variants with new fields, **unless** [NEEDS CLARIFICATION 2] is resolved to Option B or C.
- **NG-004**: This work does NOT change the on-the-wire shape of the existing `active_storyboard` SystemState feature — only its writer location (host-private → shared helper) and the addition of a fixture.
- **NG-005**: This work does NOT design or build web-shell's per-user persistence — that remains #250's scope, narrowed by this work.
