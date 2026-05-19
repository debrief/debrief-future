# Implementation Plan: Migrate session-state slices into in-plot SystemState features

**Branch**: `claude/start-speckit-249-wFYtR` (active feature: `261-session-state-systemstate`)
**Date**: 2026-05-19
**Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/261-session-state-systemstate/spec.md`

## Summary

Migrate three Zustand session-state slices (`temporal`, `spatial`, `selection` — today stored entirely in the `.debrief-session` sidecar) into the plot file as `SystemState` GeoJSON Features, mirroring the #237 precedent that shipped `active_storyboard` runtime in web-shell. Per Q1/Q2 resolutions in the spec, the migration includes `selected_ids` as plot-shared (Q1=B) and grows the LinkML `temporal` variant by one optional field, `current_time` (Q2=B).

**Technical approach**: Single shared TypeScript helper (`services/session-state/src/system-state/`) reads and writes all four `SystemState` variants against a plot's `FeatureCollection`. Both hosts (`apps/vscode/`, `apps/web-shell/`) consume the helper through their existing load/save commands. #237's host-private writer (`apps/web-shell/src/services/activeStoryboardPersistence.ts`) is folded into the helper. The LinkML schema grows `current_time` additively on the temporal variant **and** unifies the spatial variant onto `viewport: ViewportPolygon` (review resolution 1B — replaces parallel `bbox`/`zoom`/`center` fields under Article XIV.1, zero runtime blast radius). Generated TS + Python bindings regenerate; golden fixtures land for all four variants (closing the gap that #237 left for `active_storyboard`). Provenance writes use existing LinkML `LogEntry` fields (review resolution 2A — no new fields added to LogEntry). VS Code save sequences FC-first/sidecar-second to close the silent-failure path (review resolution 3A, FR-019); the helper's cross-field validator rejects out-of-window `current_time` and degenerate temporal windows (FR-018). The sidecar continues to exist for non-migrated per-machine fields (playback control, drawing mode, viewport lock); only migrated fields are dropped from it on save. Schema-version bump on the sidecar header marks the migration boundary for forward/backward compatibility.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode mandatory per Article XV) for shared helper, both hosts, and tests; Python 3.11 for LinkML codegen, Pydantic adherence tests, and schema validation gates.

**Primary Dependencies**: LinkML ≥1.7.0 (master schema source — extended this work); `@debrief/schemas` (generated types — regenerated); Pydantic v2 (Python schema validation); existing `@debrief/session-state` Zustand store (extended, not replaced); existing writer abstraction (`@debrief/stac-writer` / `FilesystemAdapter`) — SystemState writes route through it per Article IV.4. **No new external runtime dependencies.**

**Storage**: Plot file `*.plot.geojson` (GeoJSON `FeatureCollection`) — the destination for migrated state, accessed through the existing writer abstraction. Sidecar `*.debrief-session` (JSON sibling file) — continues to exist for non-migrated per-machine fields. Web-shell continues to use the existing IndexedDB-backed plot store from #236; no new browser-storage adapter is introduced.

**Testing**: LinkML schema adherence tests (golden fixtures + round-trip + structural comparison per Article II.2); Vitest unit tests for the shared helper + slice-to-variant field mappings; Playwright E2E for the cross-host parity matrix (web-shell `run-playwright.mjs`, VS Code `apps/vscode/test/`).

**Target Platform**: VS Code Extension API ≥1.85 (Node.js extension host); web-shell (modern evergreen browsers — Chromium ≥120 via `@sparticuz/chromium` in CI); Python 3.11 (schema + CI only — no runtime Python touched by this work).

**Project Type**: Monorepo with multiple frontends sharing a TypeScript services layer (web app architecture — VS Code extension host + browser-hosted web-shell + Python services + shared component/schema/state packages).

**Performance Goals**: Adding three additional `SystemState` Features to a typical plot's `FeatureCollection` (≤4 features total, ≤2 KB serialised) must not materially affect load or save latency. Target: SystemState read/write overhead < 5 ms per plot operation, measured against an existing baseline plot load. Per-save SystemState write path must be O(1) in features (lookup-by-`state_type`, not scan-then-reconstruct).

**Constraints**:
- Article I.3 (no silent failures): malformed `SystemState` features fail loudly at load with a user-visible error.
- Article II.1 (single source of truth): all `SystemState` types in runtime code come from the generated TS/Python bindings, not hand-rolled.
- Article II.2 (schema tests mandatory): all four variants get golden fixtures (valid + invalid) before runtime merges.
- Article III.1 (provenance always): every `SystemState` write records a `LogEntry` identifying host and save action.
- Article IV.2 + IV.4 (frontends never persist directly; persistence via writer abstraction): SystemState writes compose with the existing writer, do not bypass it.
- Article IV.5 (boundary types derived, not rewritten): the shared helper consumes generated `SystemStateProperties` types directly; any "DTO for a variant subset" uses `Pick<>` / discriminated narrowing, not hand-rewritten field lists.
- Article XIV.4 (strict on import): loading a `SystemState` feature with state_type=temporal but missing `current_time` is a strict validation failure, not a tolerant fallback. (Pre-migration plots have NO `SystemState` feature, which is a separate code path — not the same as a malformed one.)
- Article XV (strict type safety): no `any`/`Any` anywhere; generated types are canonical; runtime narrows at the schema boundary (parsing the JSON `properties` blob into a discriminated `SystemStateProperties` union).

**Scale/Scope**:
- 4 `SystemState` variants (3 newly produced by this work + `active_storyboard` from #237, now consolidated under the shared helper).
- 2 hosts: VS Code, web-shell. Both gain symmetric SystemState read+write.
- 1 LinkML schema edit (additive: `current_time` on `temporal` variant).
- 3 slice files touched in `services/session-state/src/store/slices/` (no shape change — only persistence wiring).
- 2 persistence boundary files in `services/session-state/src/persistence/` (`load.ts`, `save.ts`).
- 1 new shared module: `services/session-state/src/system-state/` (~3–5 source files).
- ~16 new golden fixtures: 4 variants × 2 polarities (valid/invalid) × ≥ 2 examples each.
- ~16 cross-host parity tests (4 variants × 2 producers × 2 readers).
- Migration of 1 existing file: `apps/web-shell/src/services/activeStoryboardPersistence.ts` → shared helper (deleted, callers re-pointed).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article / Clause | Status | How this work satisfies it |
|---|---|---|
| **I.1** Offline by default | ✅ PASS | All state lives in the plot file (already local). No new network calls. |
| **I.3** No silent failures | ✅ PASS | Edge cases in spec (malformed SystemState feature, two features sharing state_type, missing required fields under Article XIV.4) all surface as load errors with feature IDs. |
| **II.1** Single source of truth | ✅ PASS | All `SystemState` types consumed by runtime are imports from `@debrief/schemas` (LinkML-generated). No hand-rolled subset types. |
| **II.2** Schema tests mandatory | ✅ PASS contingent | FR-002 mandates golden fixtures for all four variants (today: 0/4). Phase 1 produces them in `shared/schemas/fixtures/system-state-*/` before runtime code lands. |
| **II.3** Schema versioning | ✅ PASS | `current_time` addition is **additive only** — no existing fields renamed, retyped, or removed. Existing `active_storyboard` fixtures from #237's runtime remain valid against the bumped schema. Sidecar `SessionFile.version` bumps minor (additive). |
| **III.1** Provenance always | ✅ PASS | FR-010 mandates `LogEntry` on every `SystemState` write. Helper enforces this — writes without provenance are a programming error, not a runtime tolerance. |
| **III.3** Audit trail immutable | ✅ PASS | Provenance entries append to the variant's `provenance` array; never modify existing entries. |
| **IV.1** Services never touch UI | ✅ PASS | The shared helper is a pure TS module returning data. No UI imports. Hosts handle display. |
| **IV.2** Frontends never persist directly | ✅ PASS | The helper does not write to disk/IndexedDB directly — it transforms a `FeatureCollection` and returns it. The existing writer abstraction owns the actual persistence step. |
| **IV.4** Persistence-host abstraction | ✅ PASS | SystemState writes compose with `setFeatureCollection` (web-shell) / VS Code's STAC writer (extension host) — both already route through the writer abstraction. No new persistence path. |
| **IV.5** Boundary types derived, not rewritten | ✅ PASS | Inter-module boundaries (helper ↔ slices, helper ↔ host) consume generated `SystemStateProperties` types. Variant-subset usage employs discriminated narrowing on `state_type`, never hand-rewritten field lists. Helper exports include compile-time exhaustiveness guards on the `state_type` enum so adding a new variant in LinkML fails the build until the helper handles it. |
| **VI.1** Schema tests gate merges | ✅ PASS | Phase 1 fixtures + adherence tests are gating; runtime PR can't merge until they pass. |
| **VI.2** Services require unit tests | ✅ PASS | Shared helper gets dedicated Vitest suite; slice-to-variant mapping functions tested per-mapping. |
| **VI.3** Integration tests for workflows | ✅ PASS | Cross-host parity matrix (web-shell ↔ VS Code, 16 test cases) is integration-level coverage of the round-trip. |
| **VII** Tests before implementation | ✅ PASS contingent | Phase 1 generates fixtures + contract tests before Phase 2 (tasks) generates runtime code; SC-008 makes the order explicit. |
| **VIII.1** Specs before code | ✅ PASS | Spec ratified; this plan precedes implementation. |
| **VIII.3** ADRs for significant choices | ✅ PASS contingent | Two decisions reach ADR threshold: (a) shared-helper location; (b) plot-shared `current_time` with the Q2 dirty-on-scrub UX contract (FR-017). Both noted for ADR capture during implementation. |
| **IX.1** Minimal, vetted dependencies | ✅ PASS | No new external runtime dependencies introduced. |
| **XIV.4** Strict on import | ✅ PASS | Pre-migration plots (no SystemState features) are a known-shape input — they load via the sidecar fallback path. Malformed SystemState features fail load — no tolerant defaults. |
| **XIV.5** Fix the data, never relax the schema | ✅ PASS | The `current_time` field is added cleanly via LinkML edit + regen + new fixtures. No validators are loosened to tolerate "old" plots — old plots simply lack the SystemState feature and route through the sidecar fallback. |
| **XV.1–7** Strict type safety | ✅ PASS contingent | All new code in TS strict mode; no `any`; generated bindings are canonical; runtime narrows via Zod validators (or Pydantic equivalents) at the JSON parsing boundary. ESLint rule `no-direct-persistence-in-frontend` continues to gate frontend code. |

**Verdict**: All gates passable. No exceptions requiring "Complexity Tracking" entries.

**Notable defences in plan** (including review-driven adjustments):
1. Consolidates #237's host-private `activeStoryboardPersistence.ts` into the shared helper — prerequisite for FR-011/FR-012 (single producer of SystemState writes) and Article II.1.
2. **Per review resolution 1B** — replaces the LinkML `SystemStateProperties.spatial` `bbox`/`zoom`/`center` fields with `viewport: ViewportPolygon` (identity-mapped to the slice). Resolves a pre-existing Article II.1 violation in the schema. Article XIV.1 covers the field removal (zero runtime blast radius — no producers today).
3. **Per review resolution 2A** — provenance writes use existing LinkML LogEntry fields (`agent`, `was_generated_by.{tool, tool_version}`, `activity_type`, `timestamp`, etc.) verbatim. No `host` field added. No silent second schema change.
4. **Per review resolution 3A** — adds (a) cross-field validation for `current_time` bounds + degenerate window (FR-018, closes F2 silent failure), (b) FC-first/sidecar-second save sequencing in VS Code (FR-019, closes F1 silent failure), (c) a legacy-plot integration fixture corpus that exercises real file I/O (closes the SC-005 false-confidence gap).

## Project Structure

### Documentation (this feature)

```text
specs/261-session-state-systemstate/
├── spec.md                   # Feature specification (already exists)
├── plan.md                   # This file
├── research.md               # Phase 0 output — open design questions resolved
├── data-model.md             # Phase 1 output — entity shapes, field mappings
├── contracts/                # Phase 1 output — helper API + schema deltas
│   ├── linkml-delta.md       # The current_time addition to geojson.yaml
│   ├── system-state-helper.ts.md  # Shared helper API contract
│   └── slice-mappings.md     # Sidecar ↔ SystemState field mapping per slice
├── quickstart.md             # Phase 1 output — verification walkthrough
├── checklists/
│   └── requirements.md       # Spec quality checklist (already exists)
├── evidence/
│   ├── opening-context.md    # Phase 2 output — cached opener for the blog post
│   └── screenshots/          # Populated by Playwright during /speckit.implement
└── tasks.md                  # NOT created by /speckit.plan — /speckit.tasks output
```

### Source Code (repository root)

```text
shared/
└── schemas/
    ├── src/
    │   ├── linkml/
    │   │   └── geojson.yaml          # MODIFIED — add current_time to SystemStateProperties (temporal variant)
    │   ├── generated/
    │   │   ├── typescript/types.ts   # REGENERATED via codegen
    │   │   └── python/debrief_schemas/...  # REGENERATED via codegen
    │   └── linkml/common.yaml        # UNCHANGED — SystemStateTypeEnum already lists temporal/spatial/selection/active_storyboard
    └── fixtures/
        └── system-state/             # NEW directory
            ├── valid/
            │   ├── active-storyboard.json
            │   ├── temporal.json
            │   ├── spatial.json
            │   └── selection.json
            └── invalid/
                ├── temporal-missing-current-time.json
                ├── spatial-bad-bbox.json
                ├── selection-non-string-id.json
                ├── multiple-same-state-type.json
                └── unknown-state-type.json

services/
└── session-state/
    └── src/
        ├── index.ts                   # MODIFIED — export new system-state helpers (typed boundary, no `any`)
        ├── system-state/              # NEW shared helper module
        │   ├── index.ts               # Public API barrel
        │   ├── read.ts                # readSystemStateFromFeatureCollection(fc) -> SystemStateMap
        │   ├── write.ts               # writeSystemStateIntoFeatureCollection(fc, state) -> FeatureCollection
        │   ├── mapping.ts             # slice↔variant field mapping tables (typed; one source per slice)
        │   ├── validate.ts            # Runtime narrowing (Zod / discriminated narrow on state_type)
        │   ├── exhaustive.ts          # Compile-time exhaustiveness guards over SystemStateTypeEnum
        │   └── __tests__/             # Vitest unit tests
        │       ├── read.test.ts
        │       ├── write.test.ts
        │       ├── mapping.test.ts
        │       └── validate.test.ts
        ├── persistence/
        │   ├── load.ts                # MODIFIED — read SystemState features BEFORE sidecar (FR-004); reconcile per FR-007
        │   └── save.ts                # MODIFIED — write SystemState features + drop migrated keys from sidecar (FR-008/FR-009); bump SessionFile.version (FR-015)
        └── store/slices/
            ├── temporal.ts            # UNCHANGED shape — same Zustand state, different persistence wiring
            ├── spatial.ts             # UNCHANGED shape
            └── features.ts            # UNCHANGED shape

apps/
├── vscode/
│   └── src/commands/
│       ├── saveSession.ts             # MODIFIED — call shared helper before/around sidecar write
│       └── loadSession.ts             # MODIFIED — call shared helper before sidecar read; reconcile per FR-007
└── web-shell/
    ├── src/services/
    │   ├── activeStoryboardPersistence.ts   # DELETED — logic folded into services/session-state/src/system-state/
    │   └── __tests__/
    │       └── activeStoryboardPersistence.test.ts  # DELETED or REPOINTED at shared helper
    └── playwright/tests/
        ├── active-storyboard-persistence.spec.ts   # PRESERVED — still runs via shared helper
        └── system-state-roundtrip.spec.ts          # NEW — cross-variant round-trip in web-shell
```

**Structure Decision**: Shared helper lives at `services/session-state/src/system-state/` rather than as a separate package. Rationale:

1. **Tight coupling to the store** — the helper exists to read/write SystemState features as the persistence layer for the existing session-state slices. It is not a general-purpose utility.
2. **Single import surface** — both hosts already import from `@debrief/session-state` (via `services/session-state/`). Adding a new sub-export keeps the dependency graph flat.
3. **Avoids package proliferation** — `Article IX.1` (minimal, vetted dependencies) implies "minimal, vetted *packages*" too. A new workspace package would need a new build/test pipeline for ~5 files.
4. **Forward compatibility** — if a future feature genuinely needs SystemState read/write *outside* the session-state context, the module can be promoted to its own package via `git mv` without behavioural change.

This decision will be recorded as an ADR alongside the implementation PR (per Article VIII.3 — see Constitution Check note).

## Media Components

None — backend/infrastructure feature. This work changes the persistence wiring of three Zustand slices; the on-screen behaviour (map view, time slider, selection chrome) is unchanged in look and feel. There are no new visual components, no significant visual changes, and no interactive demo that would add narrative value beyond what existing component stories already cover.

**Inclusion Criteria Applied**:
- [ ] New visual component — none
- [ ] Significant visual change — none
- [ ] Interactive demo adds narrative value — N/A

**Bundleability Verified**: N/A (nothing to bundle)

## Storybook E2E Testing

None — no interactive UI components.

The visible behaviour change (a colleague's plot loading at the saver's bbox/playhead/selection) is a workflow concern, not a component concern. It's covered under "Web-Shell E2E Testing" below.

## Web-Shell E2E Testing

This feature's user-visible behaviour is **end-to-end by nature** — "save in one host, transfer plot file only, open in another host, state survives". Playwright E2E is therefore the primary verification path for Stories 1–5 (SC-001 through SC-004).

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|---|---|---|---|
| Spatial round-trip (Story 1, SC-001) | MapView, plot-load lifecycle | `.leaflet-container`, `[data-testid="map"]` | Open plot, pan/zoom to a known bbox, save, reload page (clear in-memory store), reopen plot, assert bbox restored from plot file (not sidecar). |
| Temporal round-trip (Story 2, SC-002) | TimeController, MapView | `[data-testid="time-controller"]`, `[data-testid="playhead-input"]` | Open plot, scrub playhead, set time window via the controller, save, reload, reopen, assert start_time/end_time and current_time all restored. |
| Selection round-trip (Story 3, SC-002a) | FeatureList, MapView | `[data-testid="feature-list-item"]`, `.leaflet-marker-icon` (selected variant) | Open plot, select N features (click row, shift-click range), save, reload, reopen, assert same N features pre-selected. |
| Host parity for active_storyboard (Story 4, SC-003) | Storyboard panel | `[data-testid="storyboard-select"]` | Pin a storyboard in web-shell, verify in-plot SystemState feature; reload, assert pin survives (regression — this is #237's existing test, now running against the shared helper). |
| Sidecar shrinkage (Story 5, SC-004) | (no UI) — directly inspect file outputs | N/A | Save a plot pre- and post-migration; assert sidecar JSON omits the migrated keys; assert plot file contains the SystemState features. |
| **Save atomicity (FR-019, R-012 — added per review 3A)** | VS Code save command, FC writer (mocked to fail) | N/A | Mock `storeFeatureCollection` to throw → assert sidecar NOT written, error propagates with clear message. Mock sidecar write to throw AFTER FC succeeds → assert FC contains new SystemState features, user sees recovery hint. Covers F1 silent-failure gap. |
| **`current_time` bounds (FR-018, R-011 — added per review 3A)** | Helper validator | N/A | Hand-craft fixtures: (a) `current_time` outside `[start_time, end_time]`, (b) `start_time > end_time`. Assert `SystemStateLoadError(kind='cross-field-invariant')` thrown with offending feature ID + field values. Host surfaces error to user. Covers F2 silent-failure gap. |
| **Legacy plot fixtures (review 3A — closes SC-005 gap)** | Real file I/O round-trip | N/A | A corpus at `services/session-state/tests/integration/legacy-plot-fixtures/` of representative pre-migration plot+sidecar pairs (#237-era plots with active_storyboard only, plus pre-#237 plots with no SystemState features at all). Load each via `loadSession()`, verify in-memory state, save via `saveSession()`, verify upgrade (sidecar bumped to 1.2.0, SystemState features appear in FC). |

**Testing Strategy**:
- [x] Workflow runs end-to-end in the web-shell (`apps/web-shell/playwright/tests/system-state-roundtrip.spec.ts` — new).
- [x] Page objects extended on existing `AnalysisPage` / `CatalogPage` — no new page object class, just selector methods for time controller + selection-set inspection.
- [x] Screenshots captured for evidence: bbox-before / bbox-after-restored (proves visual identity), selection-before / selection-after-restored, sidecar-before / sidecar-after (file diff).

**Test File Location**:
- New: `apps/web-shell/playwright/tests/system-state-roundtrip.spec.ts`
- Preserved (refactored to import from shared helper): `apps/web-shell/playwright/tests/active-storyboard-persistence.spec.ts`
- VS Code-side companion: `apps/vscode/test/system-state-roundtrip.test.ts` (extension-host Mocha, not Playwright) — exercises the same helper path under the VS Code runtime to close the cross-host matrix.

**Run Commands**:
- Cloud: `cd apps/web-shell && node run-playwright.mjs system-state-roundtrip` (auto-provisions `@sparticuz/chromium`).
- Local: `pnpm --filter @debrief/web-shell test system-state-roundtrip`.

**Optional — chrome-level VS Code Webview tests**: Not needed. SystemState read/write is a host-extension concern, not a webview concern. Covered by the extension-host test above.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

(Empty — Constitution Check passes for all gates.)
