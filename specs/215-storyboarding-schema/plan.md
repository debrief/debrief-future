# Implementation Plan: Storyboarding — Schema + CRUD Core

**Branch**: `215-storyboarding-schema` | **Date**: 2026-04-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/215-storyboarding-schema/spec.md`

## Summary

Deliver the schema-first, UI-free foundation for the Storyboarding epic
(#024). This slice ships:

1. **LinkML master schema** — `Storyboard`, `Scene`, `Viewport`,
   `HistoryEntry` added to `shared/schemas/src/linkml/` and plumbed into
   `debrief.yaml`. Three generated artefacts follow automatically:
   Pydantic models, JSON Schema, and TypeScript types.
2. **Golden fixtures + Article II adherence tests** — seven required
   cases under `shared/schemas/src/fixtures/{valid,invalid}/`, wired
   into the existing `test_roundtrip.py` / `test_schema_compare.py` /
   `test_validation.py` harnesses.
3. **Headless TypeScript CRUD module** at
   `shared/components/src/storyboard/` — pure GeoJSON-Feature-in,
   GeoJSON-Feature-out. Enforces every invariant (ordering, duplicate-
   timestamp rejection, `feature_set_hash` recomputation, provenance
   append-only, deep-copy thumbnail on cross-storyboard copy, plot-open
   migration hook) at the module boundary, with a typed error
   vocabulary. No React, no VS Code API, no Leaflet on the core path.

Downstream sibling specs (#216 capture, #217 panel + playback, #218
edit suite) consume this module as their backing data layer. Shipping
it in isolation unblocks all three in parallel and lands the Article II
gates every later PR depends on.

## Technical Context

**Language/Version**: Python 3.11 (Pydantic models, fixture validation,
schema-adherence tests), TypeScript 5.x strict (headless CRUD module +
vitest unit tests), LinkML ≥ 1.7.0 (schema source).
**Primary Dependencies**: LinkML (`gen-pydantic`, `gen-json-schema`,
`gen-typescript` — existing pipeline), Pydantic v2, `ulid` (TS; ULID
generation; MIT, already in use for #175), `jsonschema` (Python fixture
validation, already used in `test_validation.py`). No React, no VS
Code, no Leaflet on the core path (FR-MODULE-018).
**Storage**: Storyboards and Scenes are **GeoJSON Features inside the
existing plot `FeatureCollection`** — no new files, no STAC API
surface. Thumbnails continue to live as STAC assets, referenced by
`thumbnail_asset_ref` (populated by #216 via the #174 capture
pipeline).
**Testing**: `pytest` for schema adherence (golden fixtures, round-
trip, structural compare, validation). `vitest` for the TS CRUD
module's unit and property-based tests. Playwright E2E is **N/A**
(no UI surface).
**Target Platform**: Schema artefacts consumed by every service and
frontend. TS module targets Node 18+ (test harness) and the browser
(future #217/#218 webview) — both via the existing `@debrief/components`
build.
**Project Type**: Schema module + headless TypeScript library inside
the existing monorepo. No new package boundaries.
**Performance Goals**: `listScenesOrdered` MUST be O(n log n) over
Scene count; typical plot carries ≤ 50 Scenes so sub-millisecond. All
other CRUD operations O(n) at worst over Scenes-in-plot.
**Constraints**: Offline-only (Article I). Strict-mode TS (no `any` —
Article XV). Pure functions throughout `detectMissingDataForScene`
(Article III provenance — no input mutation). Every mutation MUST
append exactly one `HistoryEntry` (SC-003, FR-MODULE-012, FR-
MODULE-020).
**Scale/Scope**: Typical plot: 1–3 Storyboards, ≤ 50 Scenes each.
Stress fixture: 10 Storyboards × 200 Scenes to exercise ordering and
hash recomputation. No pagination needed.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | Module is pure in-memory FeatureCollection mutation. No network. |
| I.3 No silent failures | Explicit success/failure | PASS | Typed error vocabulary (see contracts); every invalid op throws a named error *before* mutation. |
| I.4 Reproducibility | Deterministic output | PASS | `feature_set_hash` is a deterministic hash of sorted `visible_feature_ids`. ULID generation is the only non-determinism and is isolated behind an injectable clock/id source for tests. |
| II. Schema Integrity | LinkML single source of truth | PASS | All four entities defined in `shared/schemas/src/linkml/storyboard.yaml`. Pydantic + JSON Schema + TS types generated via existing pipeline. |
| II.2 Schema tests mandatory | Adherence tests before merge | PASS | Seven golden fixtures, round-trip via `test_roundtrip.py`, structural compare via `test_schema_compare.py`. See SC-001/002/003. |
| II.3 Schema versioning | Version bump + migration path | PASS | `schema_version: 1` + plot-open migration hook (FR-MODULE-019) wired as a no-op for v1, ready for later versions. |
| III. Data Sovereignty | Provenance always | PASS | Every mutation appends a `HistoryEntry` with `timestamp`, `actor`, `op`, `summary`. History is append-only (FR-MODULE-020). |
| III.3 Audit trail immutable | No history mutation | PASS | Module API has no "edit history" operation. Tests assert history never shrinks. |
| IV. Architectural Boundaries | Services never touch UI | **Justified departure** | See Article IV exception below and Complexity Tracking. |
| V. Extensibility | Fail-safe loading | PASS | Module throws typed errors at boundary; consumer decides UI surfacing. No global state, no singleton. |
| VI. Testing | Unit tests mandatory | PASS | Every public op has positive + negative tests; atomicity tests via injected mid-op failure (SC-005). |
| VII. Test-Driven AI | Tests define "done" | PASS | Acceptance scenarios in spec §3 map directly to contract-test names. |
| VIII. Documentation | Specs before code | PASS | This plan + spec.md + forthcoming data-model.md / contracts / quickstart precede code. |
| IX. Dependencies | Minimal, vetted | PASS | Adds no new runtime deps on core path; `ulid` already in use for #175. |
| X. Security | No secrets | PASS | No credentials, no network. |
| XI. I18N | Strings externalisable | PASS | Error messages use stable machine codes (e.g. `DuplicateTimestamp`). Human-readable strings live in the consuming UI layers (#217/#218), not in the core. |
| XIII. Contribution Standards | CI MUST pass | PASS | Schema tests, vitest, pytest all wired into existing CI (`task verify`). |
| XV. Strict Type Safety | No `any` | PASS | TS `strict: true` already enforced monorepo-wide. `unknown` → typed-boundary pattern at the GeoJSON entry points (parse → typed `StoryboardFeature` / `SceneFeature`). |

**Article IV — "Services never touch UI" exception (narrow, justified):**

The Storyboarding CRUD core lives in `shared/components/` (a TypeScript
package), not in `services/` (Python). This is a deliberate narrow
departure from the usual "thick Python services" pattern, justified
because:

1. Storyboard data is **pure GeoJSON-Feature round-trip** — no domain
   algorithmics, no geospatial computation, no file-format translation.
   There is no "analysis" layer that Python would add value to.
2. The data lives **inside the plot's existing FeatureCollection**, so
   it follows the same save/dirty-state path that VS Code already
   owns. Forcing a Python hop would add round-trip cost for zero logic.
3. The module is **UI-framework-agnostic**: pure functions on plain
   FeatureCollection objects, no React, no Leaflet, no VS Code API on
   the core path (FR-MODULE-018, SC-008). React bindings, if any,
   live in a sibling sub-module (`react/`) on the edge of the
   package — not on the core path.
4. Downstream specs #216–#218 consume the core module directly; a
   Python service in front of it would be a passthrough.

This departure is recorded in Complexity Tracking (below) and matches
the precedent set by the existing `shared/components/src/filter-engine/`
(#126) — a pure TS module for CQL2 filtering, also with no Python
service in front.

**Gate result**: PASS — one narrow, justified departure (Article IV)
recorded in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/215-storyboarding-schema/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (entity + state shapes)
├── quickstart.md        # Phase 1 output (consumer guide for #216–#218)
├── contracts/
│   ├── crud-module-api.md   # TypeScript public API surface + error vocabulary
│   └── storyboard.schema.json  # JSON Schema contract excerpt (for review)
├── checklists/
│   └── requirements.md  # Already exists — quality gate
└── media/
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
shared/schemas/
├── src/linkml/
│   ├── storyboard.yaml              # NEW: Storyboard, Scene, Viewport, HistoryEntry
│   └── debrief.yaml                 # MODIFIED: adds `imports: - storyboard`
├── src/fixtures/
│   ├── valid/
│   │   ├── storyboard-minimal.json             # NEW
│   │   ├── storyboard-full-featured.json       # NEW
│   │   └── storyboard-scene-minimal.json       # NEW
│   └── invalid/
│       ├── storyboard-scene-duplicate-timestamp.json   # NEW
│       ├── storyboard-scene-non-null-time-range.json   # NEW
│       ├── storyboard-scene-bearing-nonzero.json       # NEW
│       └── storyboard-scene-orphan.json                # NEW
└── tests/
    ├── test_roundtrip.py            # MODIFIED: register storyboard + scene entities
    ├── test_schema_compare.py       # MODIFIED: compare storyboard.yaml outputs
    └── test_validation.py           # MODIFIED: exercise new invalid fixtures

shared/components/
├── src/storyboard/                  # NEW headless package path
│   ├── index.ts                     # Public API re-exports
│   ├── types.ts                     # Branded-type helpers + error classes
│   ├── crud.ts                      # create/update/delete/duplicate/copy
│   ├── ordering.ts                  # listScenesOrdered + timestamp invariants
│   ├── hash.ts                      # feature_set_hash (deterministic)
│   ├── history.ts                   # HistoryEntry append helper
│   ├── missing-data.ts              # detectMissingDataForScene (pure)
│   ├── migration.ts                 # plot-open migration hook (v1 no-op)
│   ├── dtg.ts                       # DTG formatter (DDHHmmZ MMM YY)
│   └── __tests__/
│       ├── crud.test.ts
│       ├── ordering.test.ts
│       ├── hash.test.ts
│       ├── history.test.ts
│       ├── missing-data.test.ts
│       ├── atomicity.test.ts        # mid-op failure injection (SC-005)
│       └── migration.test.ts
└── src/index.ts                     # MODIFIED: re-export storyboard public API
```

**Structure Decision**: Two existing workspaces touched, no new ones:
`shared/schemas/` gains a new LinkML module + fixtures; `shared/
components/` gains a new pure-TS sub-module following the established
`filter-engine/` precedent. No Python service is added (see Article IV
exception). No VS Code, web-shell, or extension code is modified by
this spec — those arrive in #216–#218.

## Media Components

None — schema + headless-module feature. No visual components, no
Storybook stories. Downstream sibling specs (#217, #218) will supply
Storybook coverage for their visual surfaces (Scene list, panel
transport, on-map Scene rectangles, etc.).

## Storybook E2E Testing

None — no interactive UI components in this slice.

## VS Code Webview E2E Testing

None — no extension workflow changes in this slice. The CRUD module is
consumed by the webview in #217, where webview E2E coverage will land.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|-----------|--------------------------------------|
| Core CRUD module in TypeScript under `shared/components/`, not a Python service under `services/` (narrow Article IV departure) | Storyboard data is pure GeoJSON-Feature round-trip with no domain algorithms; lives inside the plot's existing FeatureCollection that VS Code already owns the save path for; has no dependencies on geospatial computation or file-format translation. Consumers (#216–#218) are all TS webview surfaces. | A Python service in front would be a passthrough — it would serialise/deserialise GeoJSON features on both sides, add IPC latency, and gain no analytical value. Precedent: `shared/components/src/filter-engine/` (#126) is also a pure TS module with no Python service, for the same reasons. |
