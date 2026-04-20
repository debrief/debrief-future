# Implementation Plan: Storyboarding — Schema + CRUD Core

**Branch**: `215-storyboarding-schema` | **Date**: 2026-04-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/215-storyboarding-schema/spec.md`

## Summary

Ship the **headless foundation** for the Storyboarding epic (#024) across
three workstreams:

1. **LinkML schema delta** — extend `FeatureKindEnum` with `STORYBOARD` and
   `STORYBOARD_SCENE`; add `storyboard.yaml` module defining
   `StoryboardProperties`, `SceneProperties`, and the `Viewport` sub-record,
   both property classes inheriting from `BaseFeatureProperties` (which
   already carries `provenance: LogEntry[]`); add one optional `agent:
   string` slot to `LogEntry` so the human actor per CRUD op is carried in
   the existing provenance surface (no new `HistoryEntry` type).
2. **Generated bindings** — Pydantic, JSON Schema, and TypeScript types
   flow through the existing generators; nine golden fixtures (three
   valid, four invalid, plus two single-Feature fixtures dedicated to the
   Py↔TS round-trip harness) exercise all three Article II adherence gates.
3. **Headless TypeScript CRUD module** at
   `shared/components/src/storyboard/`, re-exported from
   `@debrief/components`. Every mutation op returns a `Promise` (Web
   Crypto `subtle.digest` is async; the API is async-first for
   consistency). Pure queries remain sync. Structural sharing via
   `immer.produce(…)`. `sha256Hex` is lifted into
   `shared/components/src/utils/hash.ts` for reuse with the nl-cql2 module.

Downstream specs #216 (capture), #217 (panel + playback), and #218 (edit
suite) import this module. No UI, no VS Code command, no panel ships in
this slice.

## Technical Context

**Language/Version**: Python 3.11 (Pydantic models, fixture validation,
schema-comparison test); TypeScript 5.x (shared/components, strict mode).

**Primary Dependencies**:
- LinkML ≥ 1.7.0 (`gen-pydantic`, `gen-json-schema`, `gen-typescript`)
- Pydantic v2 (Python-side validation)
- `immer` **(NEW)** pinned at `^10.1.3` — structural-sharing immutability;
  added to `shared/components/package.json`. Justification in
  Complexity Tracking.
- `ulid` **(NEW)** pinned at `^3.0.2` — Node-friendly ULID generator;
  added to `shared/components/package.json`.
- Web Crypto (`crypto.subtle.digest`) — browser & Node 20+ built-in,
  no new dep (same primitive the nl-cql2 `hash.ts` module already uses).
- Vitest 1.x (unit + perf benchmarks) — already in the monorepo.
- pytest ≥ 8 — already in the monorepo; extended to spawn Node subprocess
  for cross-language round-trip harness.

**Storage**: Storyboards and Scenes round-trip as plain GeoJSON Features
inside the existing plot FeatureCollection. No new STAC collections.
Thumbnail binaries live under the plot's existing STAC Item assets (via
#174 helpers consumed in #216); this spec does not touch the STAC layer.

**Testing**:
- `shared/schemas/tests/test_roundtrip.py` — fixture-prefix-matched
  Python↔Python round-trip over Pydantic models.
- `shared/schemas/tests/test_validation.py` — invalid-fixture negative
  cases.
- `shared/schemas/tests/test_schema_compare.py` — Pydantic-generated
  JSON Schema equals LinkML-generated JSON Schema.
- `shared/schemas/tests/test_crosslang_roundtrip.py` **(NEW)** — pytest
  spawns a Node subprocess that parses + re-serialises each valid
  single-Feature fixture through the generated TypeScript models and
  pipes JSON back; pytest re-validates the round-tripped JSON against
  Pydantic. Article II SC-001 gate.
- `shared/components/src/storyboard/__tests__/*.test.ts` — unit tests
  per module (crud, ordering, missing-data, migration, provenance, dtg).
- `shared/components/src/storyboard/__tests__/perf.bench.ts` **(NEW)** —
  Vitest bench covering `createScene`, `updateScene`,
  `copySceneToOtherStoryboard` at 100/1k/10k/100k position-report fan-
  out. Target: p95 < 10 ms at 100 k positions on the CI runner.

**Target Platform**: Node 20+ (tests, CLI tooling); evergreen browsers
with Web Crypto `subtle.digest` (every host that runs the VS Code
webview or the web-shell qualifies). No network at runtime — Article I.

**Project Type**: Single (monorepo; no new app). Code lands in existing
packages (`shared/schemas`, `shared/components`).

**Performance Goals**: `createScene`, `updateScene`, and
`copySceneToOtherStoryboard` have **p95 < 10 ms at 100 k positions** on
the CI runner (FR-TEST-024). All query functions are O(n) scans over
the plot FeatureCollection.

**Constraints**:
- Offline — no network in any CRUD path (Article I).
- No UI framework imports in `shared/components/src/storyboard/index.ts`
  or its transitive dependency graph (Article IV).
- Zero `any` and zero `unknown` on the public API (Article XV).
- `provenance[]` append-only; never mutate existing entries (FR-MODULE-020).

**Scale/Scope**:
- Expected: a single plot rarely carries > 5 Storyboards × 50 Scenes =
  250 Feature rows of storyboard-related data.
- Benchmark bound: 100 k total *position reports* (i.e. plot size), with
  up to 5 Storyboards × 50 Scenes each, validated by the perf bench.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Decision | Status |
|---------|----------|--------|
| **I. Offline by default** | Pure in-memory FeatureCollection ops. SHA-256 via platform-native Web Crypto; ULID from `ulid` (no network). `deepCopyThumbnail` is taken as a caller-provided function (the module never performs I/O itself). | ✅ Pass |
| **II. Schema integrity** | LinkML is single source of truth. Three adherence gates wired: golden fixtures (nine), Pydantic↔LinkML JSON-Schema equality, cross-language Py↔TS round-trip (landing in this slice per FR-TEST-023). | ✅ Pass |
| **III. Provenance always** | One `LogEntry` appended to the inherited `BaseFeatureProperties.provenance[]` on every mutation; append-only invariant tested; `detectMissingDataForScene` pure (verified by deep-equal on inputs before/after). Single provenance surface — no parallel `history[]`. | ✅ Pass |
| **IV. Services never touch UI** | Core module is headless TypeScript in `shared/components/src/storyboard/`. The core path has zero `react`, `vscode`, `leaflet`, `@debrief/components` visual imports. Narrow departure from "Python services" pattern — justification in Complexity Tracking. | ⚠ Narrow departure (documented) |
| **V. Extensibility boundaries** | `MigrationFn`-based registry at plot-open; `runPlotOpenMigrations` is a typed seam that future schema versions register against without touching the load path. | ✅ Pass |
| **VI. Tests required** | Positive + negative test per invariant (SC-003). Atomicity test via injected mid-op failure (SC-005). Cross-language round-trip (FR-TEST-023). Perf bench (FR-TEST-024). | ✅ Pass |
| **VII. Specs before code** | This plan + spec + research + data-model + contracts + quickstart precede any implementation. | ✅ Pass |
| **IX. Dependency hygiene** | Two new runtime deps: `immer ^10.1.3` and `ulid ^3.0.2`. Both replace hand-rolled, error-prone in-house equivalents (structural clone + ID generation). Justified in Complexity Tracking. No new build-time tooling. | ✅ Pass |
| **XV. Strict type safety** | Public API: zero `any`, zero `unknown` on returns. Typed error classes (`StoryboardError` subclasses) with stable string codes. Match on `err.code`, not `instanceof`. | ✅ Pass |

## Project Structure

### Documentation (this feature)

```text
specs/215-storyboarding-schema/
├── plan.md              # This file
├── spec.md              # Feature spec (updated 2026-04-20 w/ clarifications)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── storyboard.schema.json   # Reference JSON-Schema excerpt
│   └── crud-module-api.md       # Public TS API contract
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
shared/schemas/
├── src/linkml/
│   ├── common.yaml                  ← EDIT: +STORYBOARD, +STORYBOARD_SCENE in FeatureKindEnum
│   ├── log-entry.yaml               ← EDIT: +optional `agent: string` slot
│   ├── storyboard.yaml              ← NEW: StoryboardProperties, SceneProperties, Viewport
│   └── debrief.yaml                 ← EDIT: imports += storyboard
├── src/fixtures/
│   ├── valid/
│   │   ├── storyboard-single-minimal.json           ← NEW (single-Feature; round-trip)
│   │   ├── storyboard-scene-single-minimal.json     ← NEW (single-Feature; round-trip)
│   │   ├── storyboard-full-featured.json            ← NEW (FeatureCollection; Story+Scenes)
│   │   └── storyboard-scene-minimal.json            ← NEW (FeatureCollection; one Scene)
│   └── invalid/
│       ├── storyboard-scene-duplicate-timestamp.json
│       ├── storyboard-scene-non-null-time-range.json
│       ├── storyboard-scene-bearing-nonzero.json
│       └── storyboard-scene-orphan.json
└── tests/
    ├── test_roundtrip.py               ← EDIT: +entity entries (order scene before story)
    ├── test_schema_compare.py          ← EDIT: +storyboard module
    ├── test_validation.py              ← EDIT: +invalid cases
    └── test_crosslang_roundtrip.py     ← NEW: Py→JSON→TS→JSON→Py via Node subprocess

shared/components/
├── package.json                         ← EDIT: +immer ^10.1.3, +ulid ^3.0.2
└── src/
    ├── utils/
    │   └── hash.ts                      ← NEW: lifted from nl-cql2/hash.ts
    ├── nl-cql2/
    │   └── hash.ts                      ← EDIT: re-export from ../utils/hash.ts
    └── storyboard/                      ← NEW module
        ├── index.ts                     ← public re-exports
        ├── types.ts                     ← branded types + error classes
        ├── crud.ts                      ← createStoryboard, createScene, updateScene, …
        ├── ordering.ts                  ← listScenesOrdered, timestamp conflict detection
        ├── missing-data.ts              ← detectMissingDataForScene (pure)
        ├── migration.ts                 ← runPlotOpenMigrations, V1_MIGRATIONS
        ├── provenance.ts                ← appendLogEntry helper (Article III)
        ├── dtg.ts                       ← formatDtg
        ├── validate.ts                  ← validatePlot (invariant scanner)
        └── __tests__/
            ├── crud.test.ts
            ├── ordering.test.ts
            ├── missing-data.test.ts
            ├── migration.test.ts
            ├── provenance.test.ts
            ├── validate.test.ts
            ├── dtg.test.ts
            └── perf.bench.ts            ← Vitest bench: p95 < 10ms @ 100k positions
```

**Structure Decision**: Single-project monorepo extension. All code
lands in existing `shared/schemas/` and `shared/components/` workspaces;
no new package is introduced. The `storyboard/` folder is a sibling of
existing headless modules like `nl-cql2/` and `filter-engine/`,
following the same import-discipline rules (no UI-framework imports on
the core path).

## Media Components

None — backend/infrastructure feature. No visual components, no
Storybook stories.

## Storybook E2E Testing

None — no interactive UI components.

## VS Code Webview E2E Testing

None — no extension workflow changes. Sibling specs #216–#218 land
those changes.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| **Narrow Article IV departure**: ship the CRUD logic as a shared TypeScript module rather than a Python service. | Storyboard/Scene operations are pure GeoJSON-Feature round-trip with no domain calculation — the hot path is called from webviews during capture/playback, where a Python-service round-trip would add 50–200 ms of RPC overhead for zero domain-logic benefit. Matches the precedent set by the filter-engine (#126) and nl-cql2 (#190) modules. | Python service + MCP tool rejected: adds network + IPC latency on every Scene CRUD and every playback step for no calculation. The VS Code extension would still need a TS adapter, duplicating the logic surface. |
| **Runtime dep: `immer ^10.1.3`** | Structural-sharing immutability over FeatureCollections is a performance and correctness requirement (FR-MODULE-022). A hand-rolled deep-clone at every mutation would both violate the perf target (FR-TEST-024) and introduce subtle bugs where shared references leak back into the input. immer is the de-facto library (10M+ weekly downloads), peer-dep-free, and already battle-tested in the React ecosystem. | Hand-rolled `structuredClone` or recursive spread rejected: cloning the entire FeatureCollection on every CRUD op blows the p95 < 10 ms target at 100k positions; spread leaves nested Features aliased. |
| **Runtime dep: `ulid ^3.0.2`** | Spec requires ULID IDs (FR-SCHEMA). Node does not ship a ULID generator. `ulid` is a 2 KB zero-dep package. | `crypto.randomUUID()` rejected: ULIDs are lexicographically sortable by creation time, which several spec invariants (ordering, log ordering, round-trip stability) lean on; UUIDv4 is not. |
