# Implementation Plan: Retire the sidecar — all plot state in the FeatureCollection

**Branch**: `claude/speckit-implement-261-gC93A` (active feature: `261-session-state-systemstate`) | **Date**: 2026-05-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/261-session-state-systemstate/spec.md`

## Summary

Delete the `.debrief-session` sidecar. Every field it persisted is reclassified (per the spec's authoritative State-classification table) into one of three homes: a `SystemState` GeoJSON Feature inside `features.geojson` (viewport/rotation, time window/playhead/filter/display-mode/step/rate, selection, active-storyboard); a per-feature `visible` flag (visibility); or nothing (ephemeral — defaulted on load). A plot becomes exactly two files: `item.json` + `features.geojson`.

**Technical approach**: A single shared, pure-TypeScript helper (`services/session-state/src/system-state/`, re-exported from `@debrief/session-state`) reads and writes all four `SystemState` variants against a `FeatureCollection`. Both hosts consume it — VS Code's `openPlot`/`saveSession` commands and web-shell's IndexedDB-backed plot store — replacing the sidecar I/O that `services/session-state/src/persistence/{load,save}.ts` performs today. #237's runtime (`shared/components/src/storyboard/activeStoryboardSelection.ts`, wrapped by `apps/web-shell/src/services/activeStoryboardPersistence.ts`) is folded into the helper as the `active_storyboard` variant, its wire shape unchanged. The LinkML schema gains the migrated fields on `SystemStateProperties`, a `visible` flag on `BaseFeatureProperties`, and four per-variant `rules:` blocks; the shared value types (`ViewportPolygon`/`TimeStep`/`DisplayModeEnum`/…) are consolidated into `common.yaml` so `geojson.yaml` can reference them, paying down a pre-existing Article II.1 duplication. Exploration never marks the plot dirty; an explicit save persists the current view regardless of dirty state.

## Technical Context

**Language/Version**: TypeScript 5.x strict (shared helper, both hosts, tests); Python 3.11 (LinkML codegen, Pydantic adherence tests).

**Primary Dependencies**: LinkML ≥1.7.0 (master schema — extended); `@debrief/schemas` (generated types — regenerated); Pydantic v2 (Python validation); Zod (runtime narrowing at the JSON boundary — already used elsewhere); existing `@debrief/session-state` Zustand store (unchanged shape); the existing writer abstraction (`@debrief/stac-writer` / web-shell IndexedDB plot store) — SystemState writes ride the FeatureCollection write that already routes through it (Article IV.4). **No new external runtime dependencies.**

**Storage**: Plot directory = `item.json` (STAC) + `features.geojson` (FeatureCollection). The FeatureCollection is the sole source of truth for plot state. No sidecar. Web-shell persists the FeatureCollection to its per-origin IndexedDB plot store (#236); VS Code writes `features.geojson` on the filesystem via the STAC writer.

**Testing**: LinkML schema-adherence (golden fixtures + cross-language round-trip per Article II.2); Vitest unit tests for the shared helper and the slice↔variant mappings; Playwright web-shell E2E for the round-trip + parity matrix; a small VS Code extension-host test for the host-cross-product diagonal.

**Target Platform**: VS Code Extension API ≥1.85 (Node host); web-shell (evergreen browsers; Chromium via `@sparticuz/chromium` in CI); Python 3.11 (schema/CI only).

**Project Type**: Monorepo — TypeScript services + two frontends (VS Code extension host, browser web-shell) + Python schema layer.

**Performance Goals**: Reading/writing ≤4 SystemState features + per-feature `visible` flags adds negligible overhead to plot load/save (target < 5 ms per op; lookup-by-`state_type`, not scan-and-rebuild). FeatureCollection size grows by ≤4 small features + at most one boolean per hidden feature.

**Constraints**:
- Article I.3 (no silent failures): malformed SystemState features and cross-field-invariant violations fail load loudly with the offending feature id.
- Article II.1 (single source of truth): all SystemState/visibility types come from the generated bindings; the value-type consolidation (FR-002a) removes the existing parallel definitions.
- Article II.2 (schema tests mandatory): all four variants + a `visible:false` fixture get golden fixtures before runtime merges.
- Article III.1/III.3 (provenance): view-state features are lean (no provenance); visibility transitions append to the *affected feature's own* provenance log (FR-013/FR-014).
- Article IV.2/IV.4 (frontends persist only via the writer abstraction): the helper is pure (no I/O); persistence rides the existing FeatureCollection write.
- Article IV.5 (boundary types derived, not rewritten): the helper narrows the generated `SystemStateProperties` via `state_type`; a compile-time exhaustiveness guard over `SystemStateTypeEnum` fails the build if a variant is unhandled.
- Article XIV.1/XIV.5 (pre-release breaking changes; fix the data, don't relax the schema): `bbox`/`zoom`/`center` removed; no legacy-sidecar read shim.
- Article XV (strict types): no `any`/`Any`; runtime narrows at the JSON `properties` boundary.

**Scale/Scope**:
- 4 SystemState variants (3 newly produced + `active_storyboard` consolidated).
- 2 hosts gain symmetric SystemState read+write.
- 1 LinkML schema cluster file gains fields (`geojson.yaml`); 1 base class gains `visible` (`common.yaml`); shared value types consolidate into `common.yaml`; `session-state.yaml` shrinks (vestigial `SessionFile`/`SessionState` removed).
- ~3–5 source files in the new `system-state/` helper module + tests.
- `services/session-state/src/persistence/{load,save}.ts` sidecar I/O deleted/repurposed.
- VS Code `openPlot.ts` / `saveSession.ts` rewired; web-shell `activeStoryboardPersistence.ts` deleted (folded into helper) with call sites re-pointed.
- ~16 golden fixtures (4 variants × valid/invalid) + visibility fixture; ~16 cross-host parity assertions.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article / Clause | Status | How this work satisfies it |
|---|---|---|
| **I.1** Offline by default | ✅ PASS | All state lives in the local plot file; no network. Removing the sidecar removes a file, adds no calls. |
| **I.3** No silent failures | ✅ PASS | Malformed/duplicate/out-of-window SystemState features fail load with structured errors naming feature ids (FR-011/FR-012). |
| **II.1** Single source of truth | ✅ PASS (improves) | One persistence file (FeatureCollection) instead of two. Value-type consolidation (FR-002a) deletes the `ViewportPolygon`/`DisplayModeEnum`/`Coordinate` duplications. SystemState types are generated, not hand-rolled. |
| **II.2** Schema tests mandatory | ✅ PASS contingent | FR-006 mandates golden fixtures for all four variants + visibility; gating before runtime lands. |
| **II.3** Schema versioning | ✅ N/A (pre-release) | Article XIV.1 applies — `bbox`/`zoom`/`center` removal is a permitted pre-release breaking change (zero runtime consumers, verified). |
| **III.1** Provenance always | ✅ PASS | Visibility transitions log to the feature's own provenance. View-state markers are explicitly lean (FR-013) — a deliberate, documented choice consistent with #237. |
| **III.3** Audit trail immutable | ✅ PASS | Visibility provenance appends only. |
| **IV.1** Services never touch UI | ✅ PASS | The helper is a pure transformation returning data; no UI imports. |
| **IV.2/IV.4** Frontends persist only via the writer abstraction | ✅ PASS | The helper performs no I/O; it transforms a FeatureCollection that the existing writer (STAC writer / IndexedDB plot store) persists. No new write path. |
| **IV.5** Boundary types derived | ✅ PASS | Helper narrows generated `SystemStateProperties` by `state_type`; exhaustiveness guard over `SystemStateTypeEnum`. Sidecar-omit types use `Pick`/`Omit`, not re-listed fields. |
| **VI.1/VI.2/VI.3** Testing | ✅ PASS contingent | Schema fixtures gate; helper unit tests; cross-host round-trip integration (web-shell E2E + VS Code host test). |
| **VII** Tests before implementation | ✅ PASS contingent | Phase 1 fixtures + contract tests precede runtime (SC-008). |
| **VIII.1/VIII.3** Specs + ADRs | ✅ PASS contingent | Spec ratified; ADRs to capture: (a) sidecar retirement + two-file model; (b) visibility-as-feature-property with accepted provenance growth; (c) value-type consolidation into common.yaml. |
| **IX.1** Minimal dependencies | ✅ PASS | No new runtime dependencies. |
| **XV** Strict types | ✅ PASS contingent | All new code strict; Zod narrows at the JSON boundary; no `any`. |

**Verdict**: All gates passable. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/261-session-state-systemstate/
├── spec.md                 # Rewritten — full sidecar retirement
├── plan.md                 # This file
├── research.md             # Phase 0 — decisions (regenerated)
├── data-model.md           # Phase 1 — entity shapes + field mappings (regenerated)
├── contracts/              # Phase 1 (regenerated)
│   ├── linkml-delta.md         # SystemStateProperties + BaseFeatureProperties + consolidation
│   ├── system-state-helper.ts.md   # Shared helper public API
│   └── slice-mappings.md       # Store-slice ↔ variant field mappings (epoch↔ISO, FeatureSelection split)
├── quickstart.md           # Phase 1 — verification walkthrough (regenerated)
├── evidence/
│   └── opening-context.md  # Phase 2 — cached blog opener
└── tasks.md                # /speckit.tasks output (regenerated separately)
```

### Source Code (repository root)

```text
shared/schemas/
├── src/linkml/
│   ├── common.yaml         # MODIFIED — add `visible` to BaseFeatureProperties; absorb consolidated
│   │                       #            value types (ViewportPolygon, Coordinate dedup, TimeStep,
│   │                       #            TimeUnitEnum, DisplayModeEnum, PlaybackStateEnum, temporal types)
│   ├── geojson.yaml        # MODIFIED — SystemStateProperties: drop bbox/zoom/center; add viewport,
│   │                       #            rotation, current_time, filter_start_time, filter_end_time,
│   │                       #            display_mode, step_size, playback_rate, selected_primary;
│   │                       #            four per-variant rules: blocks
│   ├── session-state.yaml  # MODIFIED — value types removed (moved to common); SessionFile/SessionState
│   │                       #            root classes deleted (sidecar retired); slices kept only if a
│   │                       #            runtime consumer remains
│   ├── storyboard.yaml     # MODIFIED — delete duplicate DisplayModeEnum (now in common)
│   └── debrief-jsonschema.yaml  # REVIEW — may need viewport handling (FR-006a)
├── scripts/generate.py     # MAYBE MODIFIED — gen-json-schema post-processor for ViewportPolygon.coordinates (FR-006a)
└── fixtures/system-state/  # NEW — golden fixtures (valid/ + invalid/) + a visible:false feature fixture

services/session-state/
├── src/
│   ├── index.ts            # MODIFIED — export the system-state helper surface
│   ├── system-state/       # NEW shared helper
│   │   ├── index.ts            # public barrel
│   │   ├── read.ts             # readSystemStateFromFeatureCollection(fc) → SystemStateMap
│   │   ├── write.ts            # writeSystemStateIntoFeatureCollection(fc, input, ctx) → FeatureCollection
│   │   ├── visibility.ts       # read/apply per-feature `visible` flags ↔ store hidden set
│   │   ├── mapping.ts          # slice↔variant field maps + reconciliation (epoch↔ISO, FeatureSelection split)
│   │   ├── validate.ts         # Zod variant validators + cross-field invariants
│   │   ├── errors.ts           # SystemStateLoadError (5 kinds)
│   │   ├── exhaustive.ts       # compile-time guard over SystemStateTypeEnum
│   │   └── __tests__/          # Vitest
│   ├── persistence/
│   │   ├── load.ts         # MODIFIED/REPURPOSED — sidecar file-I/O removed; hydrate-from-FC helper or deleted
│   │   ├── save.ts         # MODIFIED/REPURPOSED — sidecar file-I/O removed; extract-to-FC helper or deleted
│   │   └── schema.ts       # MODIFIED/DELETED — SessionFile version machinery no longer needed
│   └── store/slices/{temporal,spatial,features}.ts   # UNCHANGED shape
apps/vscode/src/commands/
├── openPlot.ts             # MODIFIED — read SystemState + visibility from loaded FC; delete sidecar load block (188–208)
└── saveSession.ts          # MODIFIED — write SystemState + visibility into FC before features.geojson;
                            #            delete deriveSessionPath + the saveSession() sidecar call;
                            #            relax the not-dirty early-return so explicit save persists view (FR-020)
apps/web-shell/src/
├── services/activeStoryboardPersistence.ts  # DELETED — folded into shared helper
├── services/__tests__/activeStoryboardPersistence.test.ts  # DELETED/REPOINTED
└── StoryboardPanelMount.tsx                  # MODIFIED — re-point to @debrief/session-state; hydrate + persist view-state
shared/components/src/storyboard/
└── activeStoryboardSelection.ts  # REVIEW — #237 logic; either re-exported by the helper or the helper supersedes it
```

**Structure Decision**: The shared helper lives at `services/session-state/src/system-state/` (re-exported from `@debrief/session-state`), not a new package — it is tightly coupled to the store it hydrates, both hosts already import `@debrief/session-state`, and a 5-file module does not warrant its own build/test pipeline (Article IX.1). Captured as an ADR.

## Media Components

None — backend/infrastructure feature. This changes where plot state is persisted; the on-screen behaviour (map view, time controller, selection, layer visibility) is unchanged in look and feel. No new visual components, no story to bundle.

**Inclusion Criteria Applied**:
- [ ] New visual component — none
- [ ] Significant visual change — none
- [ ] Interactive demo adds narrative value — N/A

**Bundleability Verified**: N/A

## Storybook E2E Testing

None — no interactive UI components. The visible behaviour change (a transferred plot file restoring the saver's view/selection/visibility) is a workflow concern, covered under Web-Shell E2E.

## Web-Shell E2E Testing

The user-visible payoff is end-to-end by nature: "save in host A, transfer ONLY `features.geojson`, open in host B, state survives." Playwright web-shell E2E is the primary verification path and the source of record for blog/PR screenshots.

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|---|---|---|---|
| Self-describing round-trip (US1, SC-001) | MapView, TimeController, FeatureList | `.leaflet-container`, `[data-testid="time-controller"]`, `[data-testid="feature-list-item"]` | set viewport + time window + playhead + selection + hide a feature → explicit save → reload (clear store) → reopen `features.geojson` only → assert all restored |
| Two-file invariant (US2, SC-002) | file outputs | N/A | after save, assert the item dir has `item.json` + `features.geojson` and **no** `*.debrief-session` |
| Visibility round-trip (US3, SC-004) | FeatureList, MapView | `[data-testid="feature-list-item"]`, layer toggle | hide two features → save → reload → reopen → same two hidden; file shows `visible:false` on exactly those |
| active_storyboard regression (US4, SC-003) | Storyboard panel | `[data-testid="storyboard-select"]` | #237's existing spec runs unchanged against the shared helper |
| Cross-field invariant (FR-011) | helper validator | N/A | hand-crafted fixtures (`current_time` out of window; `start_time > end_time`) → `SystemStateLoadError(kind='cross-field-invariant')` surfaced |
| Strict-on-import (FR-012) | helper validator | N/A | malformed SystemState feature (missing discriminator / unknown state_type / two same state_type) → structured error naming feature id |

**Testing Strategy**:
- [x] Round-trip runs end-to-end in the web-shell (`apps/web-shell/playwright/tests/system-state-roundtrip.spec.ts` — new).
- [x] Page objects extended on existing `AnalysisPage`/`CatalogPage` (time-controller + selection + visibility selectors) — no new page-object class.
- [x] Screenshots captured into `specs/261-session-state-systemstate/evidence/screenshots/` from the spec (viewport before/after, selection before/after, two-file directory listing, interaction GIF of the headline flow).

**Test File Location**:
- New: `apps/web-shell/playwright/tests/system-state-roundtrip.spec.ts`
- Preserved (re-pointed to the shared helper): `apps/web-shell/playwright/tests/active-storyboard-persistence.spec.ts`
- VS Code companion (extension-host, closes the cross-product diagonal): `apps/vscode/test/system-state-roundtrip.test.ts`

**Run Commands**:
- Cloud: `cd apps/web-shell && node run-playwright.mjs system-state-roundtrip`
- Local: `pnpm --filter @debrief/web-shell test system-state-roundtrip`

**Optional — chrome-level VS Code Webview tests**: Not needed. SystemState read/write is a host-extension concern, covered by the extension-host test.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified.

(Empty — Constitution Check passes for all gates.)
