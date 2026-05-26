# Tasks: Promote STAC catalog hand-types to LinkML

**Feature**: `223-linkml-stac-catalog`
**Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md) | **Data model**: [data-model.md](data-model.md) | **Quickstart**: [quickstart.md](quickstart.md) | **Research**: [research.md](research.md)
**Branch**: `claude/implement-speckit-223-qhS04`
**Strategy**: Three migration slices (P1 envelopes → P2 members → P3 Collection family). Each slice is independently shippable and verified by re-running the audit scanner.

## Evidence Requirements

**Feature type**: Schema Change + Boundary-type promotion (Python ↔ TypeScript).
**Evidence Directory**: `specs/223-linkml-stac-catalog/evidence/`
**Media Directory**: `specs/223-linkml-stac-catalog/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | pytest + vitest results (use `.specify/templates/evidence/test-summary-template.md`) with YAML front matter — totals for new `test_stac_*` modules, schema-comparison passes, fixture-corpus pass count (73 items + 2 catalogs), Playwright SC-006 pass/fail. | After Polish phase verify step |
| `evidence/usage-example.md` | Concrete demonstration: snippet that imports `StacItem` from `@debrief/schemas`, instantiates a Pydantic `StacItem` in Python, serialises to JSON, parses back through TypeScript, asserts byte-equivalent. Shows the "single source of truth" payoff in one screenful. | After P3 lands |
| `evidence/round-trip-evidence.md` | The hallmark Schema-Change artifact (per template). Records the full Python → JSON → TypeScript → JSON → Python round-trip for the three golden fixtures (`track-only` item, `multi-track-mixed` item, root Collection) — includes byte counts, the sorted-keys diff confirmation, and the assertion strings. Direct evidence for FR-006 acceptance. | After fixture-corpus + golden round-trip tests pass |
| `evidence/audit-before-after.md` | Output of the type-audit re-run (per quickstart Step 3) showing §3.1 / §3.2 row counts dropping by 5 + 5 — direct evidence for SC-001 / SC-002. Includes the verbatim grep commands. | After Polish phase audit re-run |
| `evidence/no-handtype-grep.md` | Output of the SC-003 grep commands (quickstart Step 4) demonstrating zero remaining hand-typed `interface StacItem` / `interface StacCatalog` / etc. outside `shared/schemas/`. | After P3 lands |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener (What We're Building, How It Fits, Key Decisions) — written during `/speckit.plan`. | Already cached |
| `media/shipped-post.md` | Feature post combining cached opener + ship-time evidence. Title: "Building schema-rooted STAC envelopes". | During Polish phase via Content Specialist agent |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief-future` with the evidence directory contents linked from the description. | Final task in Polish phase |
| Blog PR | PR in `debrief.github.io` with `shipped-post.md`. | Triggered automatically by `/speckit.pr` |

### Notes

- **Schema-Change feature type**. Per the Evidence Planning Rules table, the required hallmark artefact is `round-trip-evidence.md` (Python → JSON → TS → JSON → Python). This feature also adds an audit before/after artefact because SC-001 / SC-002 are *measured* outcomes — the audit numbers are the headline result.
- **No UI changes** — no screenshots, no interaction GIF. Confirmed by plan.md "Media Components" section. The Playwright SC-006 reuse-test produces a pass/fail signal that lands in `test-summary.md`, not a video.
- **VS Code Extension Workflow note does NOT apply** here — the migration is invisible at the UI surface (plan.md "Media Components"). SC-006 only asserts no-regression in the existing flow; no new flows captured.

## Phase 1: Setup

**Goal**: Prepare the development environment, verify the toolchain, and capture a baseline so progress can be measured.

- [ ] T001 Confirm working tree is clean and on the designated dev branch (`claude/implement-speckit-223-qhS04`); pin the active feature via `echo 223-linkml-stac-catalog > .specify/.active-feature` if not already set
- [ ] T002 [P] Verify schema toolchain is functional: `cd shared/schemas && make generate` succeeds on `main` (records the pre-feature baseline runtime for NFR-001)
- [ ] T003 [P] Capture the pre-feature audit baseline: `pnpm tsx scripts/audits/type-audit/scan.ts && pnpm tsx scripts/audits/type-audit/generate-report.ts > tmp/type-audit-report-before.md`, then `grep -c "Open #223" tmp/type-audit-report-before.md` to record the starting §3.1 row count (must equal 5) `tmp/type-audit-report-before.md`
- [ ] T004 [P] Inventory the 73 STAC items + 1 STAC 1.1 Collection root under `preview/workspace/samples/local-store/` and the 1 STAC 1.0 Catalog root under `apps/vscode/test-data/local-store/` — confirm counts match plan.md and capture file list for fixture-corpus test generation `tmp/stac-fixture-inventory.txt`

**Checkpoint**: Toolchain green, baseline numbers recorded, fixture inventory ready. No code changes yet.

## Phase 2: Foundation (LinkML schema + generator post-processing — blocks all stories)

**Goal**: Land the new `stac.yaml` LinkML source containing all 12 classes (P1+P2+P3) plus the `StacTypeEnum` discriminator, extend `scripts/generate.py` with the R-011 post-processing entries, regenerate Pydantic + TypeScript + JSON Schema artefacts, and document the no-runtime-validation rule. After this phase, the generated types exist; the per-site migrations land in Phases 3-5.

**Why all-at-once**: data-model.md authoring is cheap (~250 lines); splitting the schema by user story would require three regenerations and three rounds of conflict resolution against the master `debrief.yaml` import. The schema is generated atomically; the *consumer migrations* are sliced by story.

**Independent test**: After Phase 2, `cd shared/schemas && make generate && make test` passes; `pnpm -r typecheck` still passes (consumers still use hand-types — those swap in Phases 3-5).

### Schema authoring

- [ ] T005 Author `shared/schemas/src/linkml/stac.yaml` with all 12 classes per data-model.md Groups 1-3 (`StacItem`, `StacItemProperties` mixin, `StacCatalog`, `StacLink`, `StacAsset`, `StacExtent`, `StacSpatialExtent`, `StacTemporalExtent`, `StacSummaries`, `StacProvider`, `StacCollection`) plus the `StacTypeEnum` permissible-value enum; compose `StacExtensionProperties` and `PlatformRecord` from `stac-extension.yaml` via mixin/import (FR-001, FR-005, D-003) `shared/schemas/src/linkml/stac.yaml`
- [ ] T006 Add `- stac` to the `imports` block of `shared/schemas/src/linkml/debrief.yaml` (mirrors the `mcp` import added by #222); confirm `linkml-validate -s src/linkml/debrief.yaml` passes `shared/schemas/src/linkml/debrief.yaml`

### Generator post-processing (R-011)

- [ ] T007 Extend `shared/schemas/scripts/generate.py` with three new per-class fix-up entries following the GeoJSON precedent: (a) `_pydantic_coord_fixes` — `StacSpatialExtent.bbox: list[float]` → `list[list[float]]` and `StacTemporalExtent.interval: list[str]` → `list[list[str | None]]`; (b) `_coordinate_type_fixes` (TypeScript) — `bbox: number[]` → `number[][]` and `interval: string[]` → `(string | null)[][]`; (c) `_GEOJSON_COORDINATE_SCHEMAS` (or a renamed `_NESTED_ARRAY_SCHEMAS` table) — nested-array JSON Schema for both `StacSpatialExtent.bbox` and `StacTemporalExtent.interval` (research.md R-011) `shared/schemas/scripts/generate.py`
- [ ] T008 Patch the TypeScript any_of union for `StacItem.geometry` (same pattern as existing `TrackFeature` / `ReferenceLocationFeature` geometry fixes at `generate.py:409-419`) — replace `geometry: string` with `geometry: GeoJSONPoint | GeoJSONLineString | GeoJSONPolygon | GeoJSONMultiPoint | GeoJSONMultiLineString | GeoJSONMultiPolygon` `shared/schemas/scripts/generate.py`

### Discriminated union + Python alias

- [ ] T009 Add the `StacCatalogOrCollection` discriminated-union *TypeScript-only* alias to `shared/schemas/src/typescript/aliases/stac-unions.ts` (the LinkML emits the two concrete classes; the union alias is in the TS-only aliases directory per data-model.md §"TS-only aliases") `shared/schemas/src/typescript/aliases/stac-unions.ts`
- [ ] T010 Mirror the union as a Python alias in `shared/schemas/src/generated/python/debrief_schemas/stac_unions.py` (Pydantic discriminated union via `Annotated[Union[...], Field(discriminator='type')]`) so Python consumers can narrow symmetrically `shared/schemas/src/generated/python/debrief_schemas/stac_unions.py`

### Regeneration + adherence tests

- [ ] T011 Run `cd shared/schemas && make generate`; confirm `src/generated/python/debrief_schemas/__init__.py`, `src/generated/typescript/types.ts`, and `src/generated/json-schema/*.json` all contain the new STAC classes and the nested array shapes are correct (sanity-check `StacSpatialExtent.bbox: list[list[float]]` in Pydantic, `number[][]` in TypeScript)
- [ ] T012 [P][test] Author `shared/schemas/tests/test_stac_roundtrip.py` covering Python → JSON → JSON → Python round-trip for `StacItem`, `StacCatalog`, `StacCollection`, `StacLink`, `StacAsset`, `StacExtent`, `StacSummaries`, `StacProvider` (FR-006 round-trip, FR-006 negative — at least one invalid fixture per class fails with a field-level error) `shared/schemas/tests/test_stac_roundtrip.py`
- [ ] T013 [P][test] Author `shared/schemas/tests/test_stac_schema_compare.py` — asserts the JSON Schema generated by LinkML matches the JSON Schema generated from each Pydantic class via the existing schema-comparison helper (FR-006 schema comparison) `shared/schemas/tests/test_stac_schema_compare.py`
- [ ] T014 [P][test] Author `shared/schemas/tests/test_stac_fixtures.py` per **Decision 3A** — 73-item corpus uses `pytest.mark.parametrize` over fixture file paths, asserts `StacItem.model_validate(json.load(f))` succeeds for each (loads-only, no round-trip diff); 3-item golden subset (`track-only.plot.geojson` item, `multi-track-mixed.plot.geojson` item, root `collection.json`) additionally asserts sorted-keys-recursive byte-equivalent round-trip. FR-006 fixture corpus + FR-011 additive loading. `shared/schemas/tests/test_stac_fixtures.py`
- [ ] T015 Run `cd shared/schemas && make test` — all three new test modules + pre-existing tests must pass; if any fixture fails T014 corpus, widen the LinkML schema per FR-011 and re-iterate. Do NOT rewrite the fixture.

### Documentation + Decision 4A

- [ ] T016 [P] Document the **no-runtime-validation rule** (Decision 4A) in `specs/223-linkml-stac-catalog/data-model.md` — add a new section "TypeScript adoption is types-only" stating: no Zod, no `parse()`, no `is*()` predicates on imported `@debrief/schemas` types. Pydantic write-side is the validation point. Cross-references Constitution Article IV.1 (thick services / thin frontends) and Article II.2 (schema-adherence tests are the cross-language validator) `specs/223-linkml-stac-catalog/data-model.md`
- [ ] T017 [P] Mirror the no-runtime-validation rule into `specs/223-linkml-stac-catalog/quickstart.md` Step 3 grep gate — append a check that confirms no `z.object`, `.parse(`, or `is${StacClass}` predicates were added to TS consumers of the new schema types `specs/223-linkml-stac-catalog/quickstart.md`
- [ ] T018 Add the worked example for the STAC cluster to `shared/schemas/README.md` (NFR-003) — list it alongside GeoJSON / session-state / styling / MCP `shared/schemas/README.md`

**Checkpoint**: All generated artefacts exist, all adherence tests pass, the no-runtime-validation rule is documented. Phase 2 is the foundation; Phases 3-5 are independent consumer migrations.

**Parallel opportunities**: T012/T013/T014 (three test modules — independent files); T016/T017/T018 (three doc files — independent).

## Phase 3: User Story 1 — Item & Catalog envelopes (P1)

**Goal**: Delete the 5 audit-flagged `StacItem` / `StacCatalog` declarations across 3 files and replace them with imports from `@debrief/schemas`. Close the `@debrief/stac-writer` projection cast (A-009) via Decision 1B — delete the writer's `StacItem` declarations, force-migrate all consumers to import from `@debrief/schemas`.

**Independent test (per spec.md US1)**: Re-run the audit scanner — §3.1 rows attributed to #223 drop by exactly 5; both `StacItem` and `StacCatalog` drift clusters disappear from §3.2. `pnpm -r typecheck` passes. The fixture-corpus test (from Phase 2) confirms no consumer-visible regression.

### Per-site migration (data-model.md rows 1-5, 13)

- [ ] T019 In `apps/vscode/src/types/stac.ts`: delete `interface StacItem` (audit line 114, current line 127) and `interface StacCatalog` (audit line 153, current line 166); replace with `export type { StacItem, StacCatalog } from '@debrief/schemas'`; retain UI-only shapes (`StoreStatus`, `StacStore`, `Catalog`, helpers, camelCase `StacItemSummary` adapter — OOS-001 / OOS-002) `apps/vscode/src/types/stac.ts`
- [ ] T020 In `apps/vscode/src/services/sceneThumbnailService.ts`: delete the private `interface StacItem` (line 73); add `import type { StacItem } from '@debrief/schemas'` at the top of the file. Keep `StacItemAssets` for now — that's a Phase 4 (US2) task `apps/vscode/src/services/sceneThumbnailService.ts`
- [ ] T021 In `apps/web-shell/src/mocks/stacService.ts`: delete the private `interface StacItem` (line 23) and `interface StacCatalog` (line 39); add `import type { StacItem, StacCatalog } from '@debrief/schemas'` at the top of the file `apps/web-shell/src/mocks/stacService.ts`

### Decision 1B — Delete @debrief/stac-writer's local StacItem (A-009 closure)

- [ ] T022 In `shared/stac-writer/src/interface.ts`: delete the local `export interface StacItem` and `export interface StacAsset` declarations; the writer's `StoredItem.record`, `WriteItemInput.item` (and any other slots typed `StacItem` / `StacAsset`) must reference `@debrief/schemas` directly via the package's own dep on `@debrief/schemas`. Update `shared/stac-writer/package.json` if `@debrief/schemas` is not already a `dependencies` entry `shared/stac-writer/src/interface.ts`
- [ ] T023 Sweep all `@debrief/stac-writer` consumers and update imports: `apps/vscode/src/services/stacService.ts`, `apps/web-shell/src/mocks/stacService.ts`, any test files referencing the old `@debrief/stac-writer.StacItem` — they now import `StacItem` from `@debrief/schemas`. Grep gate: `grep -rn "from '@debrief/stac-writer'" --include="*.ts" apps/ services/ shared/ | grep -E "StacItem|StacAsset"` must return zero hits.
- [ ] T024 In `apps/web-shell/src/mocks/stacService.ts:464-474`: delete the JSON projection cast (data-model.md row 13). Both the writer and the local consumer now use the same `@debrief/schemas.StacItem`; the projection is a no-op (A-009 fully closed). Confirm by typecheck `apps/web-shell/src/mocks/stacService.ts`

### Phase 3 verification

- [ ] T025 [test] Re-run the type-audit scanner: `pnpm tsx scripts/audits/type-audit/scan.ts && pnpm tsx scripts/audits/type-audit/generate-report.ts > tmp/type-audit-report-after-p1.md`; assert `grep -c "Open #223" tmp/type-audit-report-after-p1.md` equals 0 for the `StacItem` / `StacCatalog` rows (i.e. 7 rows including R4-masked siblings remaining for P2/P3, but 5 §3.1 rows gone) `tmp/type-audit-report-after-p1.md`
- [ ] T026 [test] Run `pnpm -r typecheck && pnpm --filter '!@debrief/web-shell' test && cd apps/web-shell && node run-playwright.mjs <existing-plot-load-spec>` — confirm SC-006 stays green (no regression in "open a plot from the STAC tree"). Resolve the exact Playwright spec basename per quickstart Step 6 / Research R-007. If no suitable existing spec is found, document the gap in `evidence/playwright-reuse-note.md` and rely on the fixture-corpus test for SC-006 evidence.

**Checkpoint**: P1 envelopes are schema-rooted. The audit's flagged 5 rows are gone. A-009 is fully closed. The remaining hand-types (`StacLink`, `StacAsset`, `StacItemAssets`, `StacExtent`, `StacSummaries`, `StacCollection`, `StacCatalogOrCollection`) are still in place — Phases 4 and 5 handle those.

**Parallel opportunities**: T019/T020/T021 (three independent files); T022 must precede T023/T024 (interface change first, sweep second).

## Phase 4: User Story 2 — Link & Asset members (P2)

**Goal**: Resolve the R4-masked sibling shapes — `StacLink`, `StacAsset`, and the inline `StacItemAssets` alias — by deleting the hand-written declarations and re-exporting from `@debrief/schemas`. This is asymmetry-removal: P1 made the container envelopes schema-rooted, P2 makes their members consistent.

**Independent test (per spec.md US2)**: A grep across `apps/`, `services/`, `shared/components/` for `interface StacLink`, `interface StacAsset`, `type StacLink`, `type StacAsset` returns zero hits. The `sceneThumbnailService.ts` no longer carries an inline `StacItemAssets` — it uses `Record<string, StacAsset>` imported from `@debrief/schemas`. `pnpm -r typecheck` and the schema-adherence tests still pass.

### Per-site migration (data-model.md rows 6-8)

- [ ] T027 In `apps/vscode/src/types/stac.ts`: delete `interface StacLink` (audit line 143) and `interface StacAsset` (audit line 153); extend the existing re-export to include them — `export type { StacItem, StacCatalog, StacLink, StacAsset } from '@debrief/schemas'` `apps/vscode/src/types/stac.ts`
- [ ] T028 In `apps/vscode/src/services/sceneThumbnailService.ts`: delete the private `interface StacItemAssets` (line 63); replace its usage with `Record<string, StacAsset>`; ensure `StacAsset` is added to the file's import from `@debrief/schemas` `apps/vscode/src/services/sceneThumbnailService.ts`

### Cross-file consumer audit

- [ ] T029 Grep `apps/`, `services/`, `shared/components/` for `interface StacLink`, `interface StacAsset`, `type StacLink`, `type StacAsset` — assert zero hits outside `shared/schemas/src/` (US2 acceptance scenario 3). If a hit is found, add it to this phase's migration list and re-run the grep until clean.
- [ ] T030 Confirm `apps/web-shell/src/mocks/stacService.ts` and any other web-shell file referencing `StacLink` / `StacAsset` imports them from `@debrief/schemas`. Many consumers may already work transitively via Phase 3's import — verify explicitly `apps/web-shell/src/mocks/stacService.ts`

### Phase 4 verification

- [ ] T031 [test] Run `pnpm -r typecheck && pnpm --filter '!@debrief/web-shell' test` — the `sceneThumbnailService` test suite is the canary (it exercises `assets["scene-thumbnail-<id>"]` reads); both must stay green
- [ ] T032 [test] Re-run the schema-adherence test for `StacAsset` open-record extension keys (`file:checksum`, `file:size`, `processing:datetime`, `proj:shape`, `debrief:provenance` observed in live fixtures) — `pytest shared/schemas/tests/test_stac_fixtures.py -v` must still pass on all 73 items including those carrying extension keys (FR-005, US2 acceptance scenario 2)

**Checkpoint**: P2 member shapes are schema-rooted. The R4-masked siblings (`StacLink`, `StacAsset`) and the inline `StacItemAssets` are gone. Only the Collection family (P3) remains.

**Parallel opportunities**: T027/T028 (different files); T029/T030 (both audit-greps, can run together).

## Phase 5: User Story 3 — Collection family + Python writer migration (P3)

**Goal**: Close the Collection family (`StacCollection`, `StacExtent`, `StacSummaries`, `StacCatalogOrCollection`) by re-exporting from `@debrief/schemas`, and migrate the Python regeneration script + `services/stac/` package to use the generated Pydantic classes at the wire boundary (FR-012). This phase carries the most code change but the lowest typecheck-failure risk because it operates on Python first (which has its own tests) and TypeScript readers second.

**Independent test (per spec.md US3)**: A grep across `apps/`, `services/`, `shared/components/` for `interface StacCollection`, `interface StacExtent`, `interface StacSummaries` returns zero hits outside `shared/schemas/src/`. The `stacTreeProvider` displays the catalog tree for every store in the test fixture without visual regression. The catalog overview panel renders extent + summaries for any store promoted to a Collection. `scripts/enrich-legacy-catalog.py` produces byte-equivalent output to the pre-migration version (T036 verification).

### Per-site migration (data-model.md rows 9-12)

- [ ] T033 In `apps/vscode/src/types/stac.ts`: delete `interface StacExtent` (audit line 178), `interface StacSummaries` (audit line 192), `interface StacCollection` (audit line 201), and `type StacCatalogOrCollection` (audit line 216); extend the re-export to the full set — `export type { StacItem, StacCatalog, StacLink, StacAsset, StacExtent, StacSummaries, StacCollection, StacCatalogOrCollection } from '@debrief/schemas'` `apps/vscode/src/types/stac.ts`
- [ ] T034 In `apps/vscode/src/services/stacService.ts` and `apps/vscode/src/panels/catalogOverviewPanel.ts`: confirm the `StacCatalogOrCollection` narrow via `if (x.type === 'Collection')` succeeds at the call site without `as unknown` casts (US3 acceptance scenario 2); update any soft-narrow patterns to use the discriminated union. Grep for `as unknown as StacCollection` / `as StacCollection` and remove `apps/vscode/src/services/stacService.ts`
- [ ] T035 [P][test] Add a vitest unit test in `apps/web-shell/src/mocks/__tests__/stac-narrow.test.ts` that constructs `Catalog` and `Collection` JSON payloads, parses them as `StacCatalogOrCollection`, asserts the discriminated narrow works (US3 acceptance scenario 2 + data-model.md §"TS-only aliases") `apps/web-shell/src/mocks/__tests__/stac-narrow.test.ts`

### Python writer migration (FR-012)

- [ ] T036 In `scripts/enrich-legacy-catalog.py`: replace dict-based construction of catalog / item / collection payloads with Pydantic `debrief_schemas.StacCatalog(...)` / `StacItem(...)` / `StacCollection(...)` calls. Use `model.model_dump(by_alias=True, exclude_none=True)` for serialisation to match the on-disk shape. Smoke test by re-running the script against a sample store and `diff`-ing the output against the pre-migration version (FR-012, quickstart Step 7) `scripts/enrich-legacy-catalog.py`
- [ ] T037 In `services/stac/src/debrief_stac/`: identify the wire-boundary functions (catalog/item/collection write paths and the MCP-exposed catalog summaries from #136). At each wire boundary, validate inputs through the Pydantic generated classes (`StacItem.model_validate(...)`, `StacCatalog.model_validate(...)`) so internal `dict[str, Any]` pipelines surface validation errors loudly per Constitution Article I.3. Internal helper functions still using `dict[str, Any]` are OK — only the wire boundary changes per the OOS-noted scope `services/stac/src/debrief_stac/`
- [ ] T038 [test] Run existing `services/stac/tests/` test suite — all pre-existing tests (12+ test files) must stay green; new validation at the wire boundary may surface latent bugs in test fixtures. If so, fix the test fixtures (they're test inputs, not real on-disk fixtures), not the schema.

### Phase 5 verification

- [ ] T039 [test] Run `cd shared/schemas && make test` (full adherence suite) + `pnpm -r typecheck && pnpm --filter '!@debrief/web-shell' test` + `uv run pytest services/stac/tests/` — all green
- [ ] T040 [test] Re-run the type-audit scanner: `pnpm tsx scripts/audits/type-audit/scan.ts && pnpm tsx scripts/audits/type-audit/generate-report.ts > tmp/type-audit-report-after-p3.md`; assert (a) `grep -c "Open #223" tmp/type-audit-report-after-p3.md` equals 0; (b) `grep -cE 'drift cluster "(StacItem|StacCatalog)"' tmp/type-audit-report-after-p3.md` equals 0 (SC-001, SC-002) `tmp/type-audit-report-after-p3.md`
- [ ] T041 [test] Run the SC-003 final grep gate: `grep -rn "interface Stac\(Item\|Catalog\|Collection\|Link\|Asset\|Extent\|Summaries\)" apps/ services/ shared/components/ --include="*.ts"` must return zero hits (quickstart Step 4) `tmp/sc003-grep-output.txt`

**Checkpoint**: Migration complete. All 12 declarations deleted across 4 files + the writer-package surgery. Audit row counts: 5 → 0 (§3.1), 5 drift members → 0 (§3.2). Python writer FR-012 closed.

**Parallel opportunities**: T035 ([P][test]) can run alongside T033/T034; T036 and T037 are sequential (script depends on services/stac integration patterns).

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Capture all evidence artefacts, append the audit changelog entry (FR-010 / SC-007), write the feature blog post, run the full `task verify` pipeline (SC-005), and create the feature PR via `/speckit.pr`.

### Full-pipeline verify (SC-005)

- [ ] T042 Run `task verify` (lint + typecheck + tests + Playwright E2E per CLAUDE.md § Before Pushing). All four steps must pass. If `task` is not available, use the fallback chain: `uv run ruff check . && pnpm lint && uv run pyright && pnpm -r typecheck && uv run pytest && pnpm --filter '!@debrief/web-shell' test && (cd apps/web-shell && node run-playwright.mjs)`. Do not push if any step fails.

### Changelog (FR-010 / SC-007)

- [ ] T043 Append a new entry to `docs/type-audit-2026.md` §5 (Re-run log / changelog): before/after row counts (5 → 0 in §3.1, 5 drift members → 0 in §3.2), the git SHA of the merge commit, and a link to this spec. Annotate the audit's "Newly opened backlog items" callout for #223 as resolved `docs/type-audit-2026.md`

### Evidence collection

- [ ] T044 Capture test results using the template (`.specify/templates/evidence/test-summary-template.md`) in `specs/223-linkml-stac-catalog/evidence/test-summary.md` — include YAML front matter with `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`. Body lists totals for `test_stac_roundtrip.py`, `test_stac_schema_compare.py`, `test_stac_fixtures.py` (73 corpus + 3 golden), `services/stac/tests/`, `apps/web-shell/src/mocks/__tests__/stac-narrow.test.ts`, the SC-006 Playwright reuse result `specs/223-linkml-stac-catalog/evidence/test-summary.md`
- [ ] T045 [P] Create usage demonstration in `specs/223-linkml-stac-catalog/evidence/usage-example.md` — Python snippet that constructs `StacItem(...)` via `debrief_schemas`, serialises to JSON, parses through the generated TypeScript via a small ts-node demo, round-trips back to Python, asserts equality. Shows the "single source of truth" payoff in one screen `specs/223-linkml-stac-catalog/evidence/usage-example.md`
- [ ] T046 [P] Capture the hallmark Schema-Change artefact in `specs/223-linkml-stac-catalog/evidence/round-trip-evidence.md` — Python → JSON → TypeScript → JSON → Python round-trip for the three golden fixtures (`track-only.plot.geojson` item, `multi-track-mixed.plot.geojson` item, root `collection.json`). Include byte counts, sorted-keys diff confirmation, and the assertion strings (direct evidence for FR-006 acceptance) `specs/223-linkml-stac-catalog/evidence/round-trip-evidence.md`
- [ ] T047 [P] Capture the SC-001 / SC-002 audit before/after in `specs/223-linkml-stac-catalog/evidence/audit-before-after.md` — diff of `tmp/type-audit-report-before.md` (T003) vs `tmp/type-audit-report-after-p3.md` (T040), including the verbatim `grep -c "Open #223"` commands and their numeric outputs `specs/223-linkml-stac-catalog/evidence/audit-before-after.md`
- [ ] T048 [P] Capture SC-003 grep output in `specs/223-linkml-stac-catalog/evidence/no-handtype-grep.md` — the output of `grep -rn "interface Stac\(Item\|Catalog\|Collection\|Link\|Asset\|Extent\|Summaries\)" apps/ services/ shared/components/ --include="*.ts"` showing zero hits outside `shared/schemas/src/` (other than the documented re-export inside `apps/vscode/src/types/stac.ts`) `specs/223-linkml-stac-catalog/evidence/no-handtype-grep.md`

### Media content

- [ ] T049 Create feature blog post in `specs/223-linkml-stac-catalog/media/shipped-post.md` using the Content Specialist agent (`.claude/agents/media/content.md` via `Agent` tool, `subagent_type: "content-specialist"`). Title: "Building schema-rooted STAC envelopes". First three sections (What We're Building, How It Fits, Key Decisions) MUST be copied verbatim from `specs/223-linkml-stac-catalog/evidence/opening-context.md`. Remaining sections (Screenshots — N/A here, By the Numbers, Lessons Learned, What's Next) written from the evidence above. Note: this is a backend feature with no UI changes — the "Screenshots" section becomes "By the Numbers" (the audit deltas + fixture-corpus count + 4-file consumer migration) `specs/223-linkml-stac-catalog/media/shipped-post.md`

### PR Creation

- [ ] T050 Create PR and publish blog: run `/speckit.pr`

**Task T050 must run last. It depends on all evidence (T044-T048) and media (T049) tasks being complete.**

## Dependencies

**Story completion order** (strict — each story validates the previous, audit re-runs gate progression):

1. **Phase 1 (Setup)** — independent; no dependencies. T001 is sequential; T002/T003/T004 are parallel.
2. **Phase 2 (Foundation)** — depends on Phase 1. T005-T011 are sequential within the schema-authoring + regeneration chain; T012/T013/T014 (the three new test modules) are parallel; T015 (verify tests pass) depends on T011-T014; T016/T017/T018 (documentation) are parallel and depend on T011.
3. **Phase 3 (US1 — P1 envelopes)** — depends on Phase 2 (needs the generated types). T019/T020/T021 parallel; T022 must precede T023/T024 (interface change first, sweep second); T025/T026 (audit + Playwright reuse) depend on all prior P1 tasks.
4. **Phase 4 (US2 — P2 members)** — depends on Phase 3 (Phase 3 typecheck must be green before P2 migrations are layered on). T027/T028 parallel; T029/T030 audit-grep parallel; T031/T032 (test verification) depend on all prior P2 tasks.
5. **Phase 5 (US3 — P3 Collection + Python writer)** — depends on Phase 4. T033/T034 sequential within stac.ts (same file); T035 [P][test] parallel with T033/T034; T036 (Python script) and T037 (services/stac) sequential — script depends on services patterns; T038/T039/T040/T041 depend on all prior P3 tasks.
6. **Phase 6 (Polish)** — depends on Phase 5. T042 (full verify) gates the rest; T043 (changelog) must precede the PR; T044/T045/T046/T047/T048 parallel evidence collection; T049 (blog post) depends on T044-T048 (it reads them); **T050 (`/speckit.pr`) must run last** and depends on all of T042-T049.

**Cross-cutting dependencies**:

- The R-011 generator post-processing (T007) must work before T011 regeneration produces correct nested arrays for `StacSpatialExtent.bbox`. If T007 is wrong, T014 fixture-corpus catches it.
- Decision 1B (T022-T024) — the writer-package surgery — could be sequenced earlier (in Phase 2) but is placed in Phase 3 because it conceptually closes A-009 (the envelope migration) and is most naturally tested by the existing Phase 3 typecheck gate. Implementer may move it to Phase 2 if preferred (no impact on outcome).
- T026's Playwright reuse depends on identifying the exact spec basename (Research R-007) — if no suitable spec exists, the SC-006 relax-fallback (Storybook + vitest snapshot suite) applies.

**No external dependencies**: This feature has no ordering dependency on #241 (STAC 1.1 upgrade) per spec A-001 / D-005. The LinkML schema accepts both 1.0 and 1.1 wire shapes via additive optional fields.

## Implementation Strategy

**Incremental delivery model**: Three independently-shippable slices. Each slice is gated by an audit scanner re-run that produces hard evidence of progress.

**Recommended order**:

1. **Ship Phase 1 (Setup) silently** — pure baselining; commit `T001-T004` artefacts under `tmp/` (gitignored) or as evidence-staging only.
2. **Land Phase 2 (Foundation) as a self-contained commit** — `stac.yaml` + `generate.py` post-processing + 3 new test modules + docs. This is the load-bearing change and the most reviewable atomic unit. The generated types exist but no consumers use them yet; pre-existing `task verify` stays green.
3. **Land Phase 3 (US1 — P1 envelopes) as a follow-up commit** — 5 audit-flagged sites migrated + the writer-package surgery (Decision 1B). The audit re-run at T025 produces the headline evidence: §3.1 drops by 5. This is the most impactful single commit.
4. **Land Phases 4 + 5 together or as separate commits** — both layers operate on the same files (`stac.ts`, `sceneThumbnailService.ts`) and conflict-resolve trivially. The Python writer migration (T036-T037) is the only meaningfully-distinct chunk in Phase 5; separate it into its own commit if reviewer attention bandwidth is finite.
5. **Polish (Phase 6) is a final cleanup commit** — evidence + changelog + blog post + `/speckit.pr`.

**Risk-mitigation order**:

- **Highest risk: T007 (generator post-processing for `bbox` / `interval` list-of-lists)**. The R-011 spike validated the pattern but not the specific patches. Run T011 + T014 (fixture corpus loads-only) immediately after T007 — failure surfaces loudly here, not in Phase 3.
- **Second-highest risk: T036 (Python regeneration script byte-equivalence)**. The script's dict-based construction may have implicit field ordering that Pydantic `model_dump` doesn't preserve. Use `exclude_none=True, by_alias=True` and diff the output against a pre-migration baseline (quickstart Step 7).
- **Lowest risk: T019-T024 (consumer migration)**. Constitutional-typed find-and-replace; `pnpm -r typecheck` catches drift loudly.

**Test stratification** (per Decision 3A):

- **Schema layer (`shared/schemas/tests/`)**: round-trip + schema-compare + negative fixtures (T012/T013) + loads-only fixture corpus (T014, 73 items) + golden-subset round-trip (T014, 3 items).
- **Consumer layer**: existing test suites in `apps/vscode/tests/unit/`, `services/stac/tests/`, `apps/web-shell/playwright/tests/` — all reused, none authored.
- **One new vitest (T035)** — discriminated-union narrow at the web-shell mock call site (covers data-model.md §"TS-only aliases").

**No-runtime-validation contract (Decision 4A)**: TypeScript adoption is types-only. No Zod parsers, no `.parse()` calls, no `is*()` predicates on imported `@debrief/schemas` types. Pydantic write-side is the validation point. Documented in T016/T017; enforced in T042 typecheck.

