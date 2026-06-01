# Tasks: Replace hand-written `Safe*` GeoJSON feature types with schema-derived equivalents

**Feature**: `212-linkml-safe-feature-types` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Inputs**: research.md (R1–R6), data-model.md (per-site migration map), contracts/types.md, quickstart.md, evidence/audit-gap-report.md

> **Cloud-session note**: the git branch is `claude/intelligent-clarke-VdwDj`; the feature dir is resolved via `.specify/.active-feature`.

## Evidence Requirements

**Evidence Directory**: `specs/212-linkml-safe-feature-types/evidence/`
**Media Directory**: `specs/212-linkml-safe-feature-types/media/`

Feature type: **schema-adjacent TypeScript type refactor** (Tech Debt / Infrastructure-like). No UI ⇒ no screenshots/interaction GIF. No schema change (FR-009) ⇒ no round-trip evidence. Evidence is test output, the regression-guard validation, a usage demonstration of the derived type, and a before/after of the incidental Multi*-bbox bug fix.

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | vitest (unit + `*.test-d.ts` type tests) + pytest results; key scenarios verified | After all tests pass |
| `evidence/usage-example.md` | `IngressFeature` derivation in use + one migrated boundary (before/after) showing `geometry: null` preserved | After migration complete |
| `evidence/guard-validation.txt` | `check-no-geojson-feature.sh` output: passes clean, and rejects a planted `interface SafeFeature {}` | After guard extended |
| `evidence/bbox-fix-before-after.md` | `calculateBounds` vs the removed `extractCoordinates` on a MultiPolygon feature (latent bug fix, VR-3) | After `stacService` reuse change |
| `evidence/audit-gap-report.md` | Usage-site gap analysis (User Story 1) | ✅ Delivered during `/speckit.specify` |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener (Hook + What We're Building / How It Fits / Key Decisions) | ✅ Cached during `/speckit.plan` |
| `media/shipped-post.md` | Feature post: cached opener (first 3 sections verbatim) + By the Numbers / Lessons Learned / What's Next from evidence | Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | Already open as #662; finalised with evidence | Final task (`/speckit.pr`) |
| Blog PR | Publish `shipped-post.md` to debrief.github.io | Triggered by `/speckit.pr` |

## Phase 1: Setup & Baseline

**Goal**: Establish a green baseline and confirm the migration inventory is still accurate before touching code.

- [ ] T001 Confirm a green baseline on the feature branch — run `task verify` (lint + typecheck + test) and record that it passes before any change
- [ ] T002 [P] Re-confirm the `Safe*` usage inventory matches `evidence/audit-gap-report.md` (the branch may have moved): `grep -rn "Safe\(Feature\|Geometry\|FeatureCollection\)" apps/ shared/ services/ --include="*.ts" --include="*.tsx" --exclude-dir=node_modules` — reconcile any new/removed site with the gap report before proceeding

**Checkpoint**: baseline green; inventory current.

## Phase 2: User Story 1 — Evidence-based gap report (P1) [DELIVERED]

**Goal**: A complete, verifiable inventory of every `Safe*` usage site, classified by whether the generated `RawGeoJSONFeature` can replace it.

**Independent test**: 100% of semantic usage sites are listed with a CLEAN-SWAP / NEEDS-NARROWING / GENUINE-GAP classification, code quoted for every gap, and a reviewer can confirm each gap is real.

- [x] T003 Usage-site gap analysis (43 sites: 21 CLEAN-SWAP / 8 NEEDS-NARROWING / 14 GENUINE-GAP; two gap categories) `specs/212-linkml-safe-feature-types/evidence/audit-gap-report.md`

**Checkpoint**: ✅ Delivered during `/speckit.specify`. Drives the per-site migration map in `data-model.md`.

## Phase 3: Foundational — `IngressFeature` derived type (blocks US2–US4)

**Goal**: Introduce the schema-derived permissive boundary type so every consumer has a target before any `Safe*` reference is changed. **This phase blocks US2, US3, and US4.**

- [ ] T004 Add `IngressFeature` (`Omit<RawGeoJSONFeature,'geometry'> & { geometry: RawGeoJSONFeature['geometry'] | null }`) and `IngressFeatureCollection` to the hand-maintained companion module `shared/schemas/src/generated/typescript/unions.ts` (doc-comment the RFC-7946-unlocated rationale; do NOT re-list fields — Article IV.5)
- [ ] T005 Ensure the new types are re-exported from the package surface so `import type { IngressFeature, IngressFeatureCollection } from '@debrief/schemas'` resolves `shared/schemas/src/generated/typescript/index.ts`
- [ ] T006 [test] Add derivation type-test: `expectTypeOf<RawGeoJSONFeature>().toMatchTypeOf<IngressFeature>()` and `expectTypeOf<IngressFeature['geometry']>().toEqualTypeOf<RawGeoJSONFeature['geometry'] | null>()` `shared/schemas/tests/ingress-feature.test-d.ts`

**Checkpoint**: `pnpm --filter @debrief/schemas typecheck && test` passes; `task schema:check-drift` still green (confirms `unions.ts` is hand-maintained, not generator output — FR-009 / SC-006). `Safe*` still present elsewhere; nothing migrated yet.

## Phase 4: User Story 2 — Permissive boundaries use the derived type (P2)

**Goal**: Every genuine parse/MCP/disk/adapter boundary and host→webview message DTO references the schema-derived `IngressFeature` / `IngressFeatureCollection` (category (b) of the gap report). Depends on Phase 3.

**Independent test**: the `messages.ts` DTOs and the parse/MCP/disk boundary signatures reference `IngressFeature*` (no `Safe*`); a `geometry: null` feature still flows through them. (Verified at end-of-migration typecheck — see Implementation Strategy on the atomic nature of the change.)

> Retarget existing **named-type** casts only (`as SafeFeatureCollection` → `as IngressFeatureCollection`). Introduce no `as Record` / `as unknown` / inline-object cast (Article XV.7). Per-site line numbers: `data-model.md` migration map.

- [ ] T007 [P] `ParseResult.features: SafeFeature[]` → `IngressFeature[]` (REP parse-boundary contract) `apps/vscode/src/types/import.ts`
- [ ] T008 [P] `result.features as SafeFeature[]` → `as IngressFeature[]` (debrief-io subprocess JSON boundary) `apps/vscode/src/services/ioService.ts`
- [ ] T009 [P] MCP-result parse boundary: accumulators, return-type fields, and `JSON.parse(...) as SafeFeatureCollection[...]` → `IngressFeature*` `apps/vscode/src/services/calcService.ts`
- [ ] T010 [P] `AddResultLayerMessage.layer.features` and `UpdatePlotFeaturesMessage.features` → `IngressFeatureCollection` (Article IV.5 / FR-006 — boundary DTO references a schema-derived type) `apps/vscode/src/webview/messages.ts`
- [ ] T011 [P] `toSafeFC` → `toIngressFC`; `geometry: f.geometry as SafeGeometry | null` → `as IngressFeature['geometry']`; keep null handling for SYSTEM/storyboard features `apps/vscode/src/commands/openPlot.ts`
- [ ] T012 [P] `toSafeFeatures` → `toIngressFeatures`; rework the inline-object cast `f.geometry as { coordinates: unknown }` into a named-type cast/guard (R3 / XV.7 — clears a #277-tracked inline cast) `apps/web-shell/src/mocks/calcService.ts`
- [ ] T013 [P] `ToolExecuteFn` signature + `attachLogEntry` / `validateToolOutput` / `executeTool` params: `SafeFeature[]` → `IngressFeature[]` (preserve existing inline `eslint-disable`d bridge casts; do not expand into #277) `apps/web-shell/src/services/toolService.ts`
- [ ] T014 [P] Consumer rename `SafeFeature` → `IngressFeature`; KEEP the existing `if (!f.geometry)` null-guards and named-type coordinate casts (no logic change) `apps/vscode/src/commands/importRep.ts`
- [ ] T015 [P] Consumer rename `SafeFeature*` → `IngressFeature*`; keep the null-guard (`:1582`) and the pre-existing `DebriefFeature` bridge (`:1157`) untouched `apps/vscode/src/webview/mapPanel.ts`
- [ ] T016 [P] `execute(features: SafeFeature[])` → `IngressFeature[]`; keep the null/type guards (the throw on null geometry stays correct) `apps/vscode/src/tools/reference/classification/pointInZoneClassifier.ts`

**Checkpoint**: all permissive-boundary + webview-DTO references are `IngressFeature*`; `Safe*` now remains only in `@debrief/utils` (definition), `stacService`, the result-carrying clean-swap sites, and the bounds type-test — all handled in Phase 5.

## Phase 5: User Story 3 — Remove hand-written types; clean-swap migration; guard (P2)

**Goal**: Move result-carrying sites to the generated `RawGeoJSONFeature`, dissolve the `stacService` coordinate-read gap by reuse, then **delete** the hand-written `Safe*` family and guard against its return. Depends on Phases 3–4 (all `Safe*` references must be gone before T024).

**Independent test**: `grep -rn "Safe\(Feature\|Geometry\|FeatureCollection\)" apps/ shared/ services/` returns nothing; the regression guard fails on a planted `interface SafeFeature {}`; `pnpm -r typecheck` and `pnpm lint` pass.

- [ ] T017 [P] `ResultLayer.features` + `ToolExecutionResult.features?`: `SafeFeatureCollection` → `RawGeoJSONFeatureCollection` (result-carrying) `apps/vscode/src/types/tool.ts`
- [ ] T018 [P] Clean-swap the `__datasets` E2E hook literal + its type: `SafeFeature` → `RawGeoJSONFeature` `apps/vscode/src/extension.ts`
- [ ] T019 [P] Tool output (well-formed MultiPolygon): return type + construction `SafeFeature[]` → `RawGeoJSONFeature[]`, and update its test `apps/web-shell/src/tools/sensor/detection/bufferZoneGenerator.ts`
- [ ] T020 `stacService`: (a) `loadGeoJson`/`loadSnapshotGeoJson`/`writeGeoJson`/`addFeatures` + the `JSON.parse(content) as SafeFeatureCollection` cast → `IngressFeature*` (disk boundary); (b) **delete** `calculateBboxFromFeatures` + `extractCoordinates` and compute the bbox via `calculateBounds` from `@debrief/utils` (removes the `SafeGeometry` dependency + three `as number[]*` casts; fixes the latent Multi*-geometry bbox bug — VR-3) `apps/vscode/src/services/stacService.ts`
- [ ] T021 [P][test] Replace the `SafeFeature[]` assignability case (lines 15, 28) with an `IngressFeature[]` case — **must precede T024** `shared/utils/tests/bounds.types.test-d.ts`
- [ ] T022 [P] Update the module-header doc comments that list `SafeFeature` as a supported family → reference `IngressFeature` `shared/utils/src/bounds.ts`
- [ ] T023 Extend the regression guard to also fail on a hand-written `interface`/`type` `Safe(Feature|Geometry|FeatureCollection)` (keep the existing `GeoJSONFeature` check; update the diagnostic to point at `RawGeoJSONFeature` / `IngressFeature`) — FR-007 `scripts/check-no-geojson-feature.sh`
- [ ] T024 **Remove** the `SafeFeature` / `SafeGeometry` / `SafeFeatureCollection` definitions from `shared/utils/src/types.ts` **and** their re-exports from `shared/utils/src/index.ts` — **GATED: run only after T007–T023 (no `Safe*` reference remains)** `shared/utils/src/types.ts`

**Checkpoint**: no hand-written `Safe*` feature type exists or is exported; guard active; `task verify` typecheck + lint green.

## Phase 6: User Story 4 — Zero behavioural regression (P2)

**Goal**: Prove the refactor is behaviour-preserving — features build/lint/typecheck/test, `geometry: null` features survive every migrated boundary, and the incidental bbox fix is correct. Depends on Phases 3–5.

**Independent test**: full CI (lint + typecheck + unit + Playwright E2E) green; a `geometry: null` feature round-trips intact; `calculateBounds` includes Multi* geometry.

- [ ] T025 [P][test] Add/confirm a unit test that `calculateBounds` returns correct bounds for a `MultiPolygon` feature (the coverage `stacService` now inherits — VR-3) `shared/utils/tests/bounds.test.ts`
- [ ] T026 [P][test] Add a test that a `geometry: null` feature (SYSTEM_RECORD / STORYBOARD / NarrativeEntry) survives a migrated boundary intact (e.g. `toIngressFC` / `stacService` load→write round-trip) — VR-1 / SC-004 `apps/vscode/src/commands/__tests__/openPlot.test.ts`
- [ ] T027 Run the full unit suite + type tests — `uv run pytest && pnpm --filter '!@debrief/web-shell' test && pnpm -r typecheck` — all green
- [ ] T028 Run the existing web-shell Playwright E2E (plot load + tool execution + REP import) as the behaviour-preservation regression — `cd apps/web-shell && node run-playwright.mjs <existing-spec>` — confirm a result layer (incl. a null-geometry feature) renders unchanged

  > **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — do NOT skip this because browsers "can't install." The project bundles Linux Chromium via `@sparticuz/chromium`; `run-playwright.mjs` extracts + wires it. See `docs/project_notes/playwright-installation-research.md`.

- [ ] T029 Lint + guard verification — `pnpm lint && bash scripts/check-no-geojson-feature.sh` — no new `as Record`/`as unknown`/inline-object casts; guard passes clean and (spot-check) rejects a planted `interface SafeFeature {}`

**Checkpoint**: `task verify` + web-shell E2E green; null-geometry preserved; no schema drift (`task schema:check-drift`).

## Phase 7: Polish & Cross-Cutting Concerns

Depends on Phases 3–6 complete. Produces the evidence + media that back the PR.

### Evidence Collection

- [ ] T030 Capture test results using the template (`.specify/templates/evidence/test-summary-template.md`) with YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`); body lists key scenarios (null-geometry preserved, Multi* bbox, guard) `specs/212-linkml-safe-feature-types/evidence/test-summary.md`
- [ ] T031 Create the usage demonstration — `IngressFeature` derivation in use + one migrated boundary shown before/after, with a `geometry: null` example surviving `specs/212-linkml-safe-feature-types/evidence/usage-example.md`
- [ ] T032 [P] Capture the regression-guard output (clean run + rejection of a planted `interface SafeFeature {}`) `specs/212-linkml-safe-feature-types/evidence/guard-validation.txt`
- [ ] T033 [P] Capture the bbox before/after — old `extractCoordinates` (Point/Line/Polygon only) vs `calculateBounds` (all seven) on a MultiPolygon feature `specs/212-linkml-safe-feature-types/evidence/bbox-fix-before-after.md`

### Media Content

- [ ] T034 Create the feature blog post via the Content Specialist (`.claude/agents/media/content.md`): title prefixed `Building `; first three sections (What We're Building / How It Fits / Key Decisions) copied **verbatim** from `evidence/opening-context.md`; add By the Numbers / Lessons Learned / What's Next from evidence `specs/212-linkml-safe-feature-types/media/shipped-post.md`

### PR Creation

- [ ] T035 Create PR and publish blog: run `/speckit.pr` (finalises PR #662 with evidence; publishes `shipped-post.md` to debrief.github.io)

**Task T035 must run last** — it depends on every evidence (T030–T033) and media (T034) task being complete.

## Dependencies

**Phase order**: Phase 1 (baseline) → Phase 3 (Foundation) **blocks** Phases 4–6 → Phase 7 (Polish). Phase 2 (US1) is already delivered.

**Critical edges**:
- **T004 (add `IngressFeature`) blocks every migration task** (T007–T020) and the type-test (T006).
- **T024 (remove `Safe*`) is gated** — it can only succeed once *all* references are migrated: it depends on T007–T023, and specifically on **T021** (the bounds type-test still imports `SafeFeature`) and **T022** (bounds doc comments).
- **T020 (`stacService`)** depends on `@debrief/utils calculateBounds` already existing (it does — #200/#219) and on T004.
- **Phase 6 (regression)** depends on Phases 3–5 complete; **Phase 7 (evidence/media)** depends on Phase 6 green; **T035 (`/speckit.pr`)** depends on T030–T034.

**Story completion order**: US1 ✅ → Foundation → US2 + US3 (interleaved across files, converging on T024) → US4 → Polish.

## Implementation Strategy

**This is a single cohesive refactor, delivered as one PR (#662).** Unlike a feature with separately shippable slices, the user stories here are **review groupings**, not independently deployable increments.

**The typecheck is atomic.** `IngressFeature` is assignable *to* `SafeFeature` but `SafeFeature` is **not** assignable to `IngressFeature` (`coordinates: unknown` ✗→ typed union). So a half-migrated tree may not `tsc`-pass at an arbitrary mid-point. Treat the change as one transaction: baseline green (T001) → land the whole migration → end green (T027/T029). Do not expect each phase boundary to compile in isolation.

**Recommended execution flow**:
1. **Foundation** (T004–T006) — add the derived type + type-test.
2. **Migrate all references** — T007–T020 are mostly `[P]` (distinct files); do them together. `stacService` (T020) is the one multi-concern file; the `__tests__` and type-test updates (T019, T021) ride alongside.
3. **Converge** — update bounds doc comments (T022), extend the guard (T023), then **remove `Safe*` (T024)** once the tree is clean.
4. **Verify** (T027–T029) — full unit + type + E2E + lint/guard; confirm no schema drift.
5. **Evidence + media + PR** (T030–T035).

**Parallel opportunities**: T007–T016 (US2, 10 files) and T017–T019/T021/T022 (US3, 5 files) carry `[P]` — independent files, safe to edit concurrently. Serialization points: **T020** (`stacService`, single file, multi-concern) and **T024** (gated removal).

**Risk controls**: behaviour-preservation rests on existing null-geometry fixtures + web-shell E2E (T026, T028); the only intended behaviour *change* is the Multi*-bbox correction (T025, a fix). No new runtime dependency, no schema change, no new banned casts (Articles IX / II / XV.7).
