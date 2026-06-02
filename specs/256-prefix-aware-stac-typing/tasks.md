# Tasks: Prefix-Aware TypeScript Typing for STAC Extension Properties

**Feature**: 256-prefix-aware-stac-typing
**Branch**: `claude/item-256-spec-status-JCx2R`
**Input**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

> **Scope (post-`/speckit.review` + `/speckit.plan`)**: one schema-driven
> generator step prefixes modelled `debrief:*` slots across **three** classes
> (`StacExtensionProperties`, `StacSummaries`, `StacAsset`); two new additive
> `StacAsset` slots (`debrief:toolId`, `debrief:snapshotTimestamp`); write-path
> `props` re-typed to `StacItemProperties` at both hosts; `debrief:label`
> excluded. Typing + additive-schema only — on-disk JSON byte-for-byte unchanged.

## Evidence Requirements

**Evidence Directory**: `specs/256-prefix-aware-stac-typing/evidence/`
**Media Directory**: `specs/256-prefix-aware-stac-typing/media/`

This is a **Schema Change** feature → primary evidence is a round-trip /
byte-invariance proof plus type-level demonstrations. No UI → **no screenshots,
no Playwright, no interaction GIF**.

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | pytest + vitest + typecheck results (YAML front matter) | After all tests pass |
| `evidence/usage-example.md` | Before/after writer code: cast removal, write-path re-type, asset access | After casts removed |
| `evidence/round-trip-evidence.md` | Python → JSON → TypeScript → JSON proof + byte-identical write golden (FR-008/SC-004), incl. new `StacAsset` keys | After regen + tests |
| `evidence/generated-diff.md` | The `types.ts` 3-class block diff (before/after prefix) + drift-gate clean output | After regen |
| `evidence/opening-context.md` | Cached opener (already written during `/speckit.plan`) | ✅ done |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/shipped-post.md` | Feature post: cached opener (first 3 sections verbatim) + ship-time evidence | Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | Update PR #663 (already open) with evidence; publish blog | Final task via `/speckit.pr` |

## Phase 1: Setup

**Goal**: Capture the pre-change baseline so byte-invariance (FR-008/SC-004) and
the generated-diff evidence are provable, and confirm the test homes.

- [x] T001 Capture baseline of the generated TS for the three target classes (current bare-key form) for later before/after diff `specs/256-prefix-aware-stac-typing/evidence/baseline-types-before.txt`
- [x] T002 [P] Capture a baseline written `item.json` (with `debrief:*` props) and an asset entry (with `debrief:toolId`) from `apps/vscode/test-data/local-store/exercise-alpha/item.json` for the byte-identical write golden `specs/256-prefix-aware-stac-typing/evidence/baseline-item-before.json`
- [x] T003 [P] Confirm test homes exist (Python: `shared/schemas/tests/`; TS type-level: `shared/schemas/tests/typescript-usage.ts` + `shared/schemas/tests/ts/`) and note the existing `test_regen_idempotent.py` + `src/generated` drift gate are reused, not duplicated `specs/256-prefix-aware-stac-typing/tasks.md`

**Checkpoint**: Baseline artefacts captured; no source changed yet.

## Phase 2: Foundational (Schema-Driven Generator + Schema Change) — BLOCKS ALL STORIES

**Goal**: Add the two `StacAsset` slots and implement the **one** schema-driven
generator step that rewrites modelled slot keys to their `slot_uri` across the
three target classes, then regenerate TS + Pydantic. Everything downstream
(typed reads, write-path re-typing, audit closure) depends on this.

⚠️ **No story can be completed before this phase is done** — the regenerated
types are the contract every other phase binds to.

### Schema change (FR-011)

- [x] T004 Add two optional `string` attributes to `StacAsset` — `tool_id` (`slot_uri: debrief:toolId`) and `snapshot_timestamp` (`slot_uri: debrief:snapshotTimestamp`), with descriptions noting the on-disk colon keys `shared/schemas/src/linkml/stac.yaml`

### Schema-driven prefix transform (FR-013, FR-010, FR-001)

- [x] T005 Implement the pure function `prefix_extension_slots(block_text: str, slot_uri_map: dict[str, str]) -> str` that rewrites each bare-key slot whose name is in `slot_uri_map` to its (colon) `slot_uri`, leaving non-mapped slots untouched; deterministic, no I/O `shared/schemas/scripts/generate.py`
- [x] T006 Add a `{class -> {slot_name -> slot_uri}}` loader for `StacExtensionProperties` (from `stac-extension.yaml`), `StacSummaries`, and `StacAsset` (from `stac.yaml`), reading each slot's `slot_uri` via `SchemaView`/PyYAML and keeping only slots whose `slot_uri` carries an extension prefix (a colon CURIE) `shared/schemas/scripts/generate.py`
- [x] T007 Wire the step into `generate_typescript()` — for each of the three class blocks, call `prefix_extension_slots(...)`; guard with `raise RuntimeError` if a class block or an expected bare-key token is missing (matches the existing post-processor convention, mirrors the step-5 open-record loop) `shared/schemas/scripts/generate.py`

### Regenerate + commit artefacts

- [x] T008 Regenerate all derived artefacts (`task schema:generate`), verifying: TS `StacExtensionProperties`/`StacSummaries`/`StacAsset` carry the `debrief:`-prefixed keys; `StacAsset` Pydantic model gains two optional fields (additive); non-Debrief `StacAsset` slots (`href`/`type`/`roles`) unchanged `shared/schemas/src/generated/`
- [x] T009 Run the generator twice and confirm byte-identical output (determinism, C4 / Article I.4), then commit the regenerated artefacts so the `src/generated` drift gate is satisfied `shared/schemas/src/generated/`

**Checkpoint**: Generated types prefixed across 3 classes; `StacAsset` modelled;
artefacts committed and drift-clean. Foundation ready — stories can proceed.

## Phase 3: User Story 1 (P1) — New extension field flows to the typed surface

**Story goal**: Adding a modelled `debrief:*` slot to LinkML and regenerating
surfaces it as a typed, prefixed slot at the writers' access sites with **zero**
hand-edits to writer-owned types (FR-002 / SC-001 — the core #240-deferred
promise).

**Independent test**: Feed the pure transform a synthetic block with an *extra*
modelled slot and assert it emerges prefixed; and (worked demo) add a throwaway
`debrief:reviewed_by` slot, regenerate, confirm `'debrief:reviewed_by'` appears
typed, then revert.

### Tests for User Story 1

- [x] T010 [P][test] Pure-function unit test: call `prefix_extension_slots()` with a synthetic interface block containing an added slot (e.g. `reviewed_by` ↔ `debrief:reviewed_by`) and assert it is rewritten to the prefixed key while a non-mapped slot is untouched — proves FR-002 deterministically without a full regen `shared/schemas/tests/test_stac_prefix_transform.py`
- [x] T011 [P][test] Schema-convention guard test: load the three target classes and assert **every** slot whose `slot_uri` carries the `debrief:` prefix is emitted under its colon key in `src/generated/typescript/types.ts` (none left bare) — catches a future slot whose `slot_uri` diverges `shared/schemas/tests/test_stac_prefix_transform.py`
- [x] T012 [P][test] Structural assertion: the regenerated `StacExtensionProperties` (5), `StacSummaries` (3), and `StacAsset` (2 new) blocks each contain their prefixed keys and retain the index signature where expected (extends `test_stac_extension.py` patterns) `shared/schemas/tests/test_stac_extension.py`

### Implementation for User Story 1

> Implementation is delivered in Phase 2 (the schema-driven transform is what
> makes new fields flow). This phase's deliverable is the **proving tests**
> above plus the documented worked demo.

- [x] T013 Verify the FR-002 worked demo from `quickstart.md` end-to-end (add throwaway slot → regenerate → typed prefixed slot appears → revert) and record the transcript for evidence `specs/256-prefix-aware-stac-typing/evidence/usage-example.md`

**Checkpoint**: FR-002 is proven by an automated unit test (not just a worked
example) and the convention guard protects against future `slot_uri` drift.

## Phase 4: User Story 2 (P2) — Compile-time safety on existing access sites (read + write)

**Story goal**: A typo'd / renamed / wrong-typed modelled `debrief:*` key at any
writer access site — **read or write** — fails the typecheck instead of silently
yielding `undefined` (FR-004 / FR-012 / SC-002). Redundant casts and the
`Record<string, unknown>` widenings are removed.

**Independent test**: Introduce a deliberate typo at a *write* site (e.g.
`props['debrief:overide'] = …`) and confirm `pnpm -r typecheck` fails; correct
it and confirm it passes. Same for an asset-level `debrief:toolId` typo.

### Type-level tests for User Story 2 (the gate that catches type regressions)

- [ ] T014 [test] Add type-level assertions to the schema TS usage fixture: (a) `props['debrief:provenance_log']` is `PropertiesProvenanceEntry[] | undefined`; (b) `// @ts-expect-error` a typo'd modelled **read** key used at a concrete type; (c) `// @ts-expect-error` a wrong value type — per contract C3 `shared/schemas/tests/typescript-usage.ts`
- [ ] T015 [test] Add write-path + asset type-level assertions (contracts C8/C9): a modelled-key **write** with the wrong value type is `// @ts-expect-error`; arbitrary/core-key writes still pass via the index signature; `asset['debrief:toolId']` and `asset['debrief:snapshotTimestamp']` resolve to `string | undefined`; a wrong-typed asset read is `// @ts-expect-error` `shared/schemas/tests/typescript-usage.ts`

### Implementation for User Story 2 — VS Code host

- [ ] T016 [P] Remove the redundant `as PlatformRecord[] | undefined` / `as string[] | undefined` casts on the modelled read sites (`item.properties['debrief:platforms' | 'debrief:tags' | 'debrief:feature_tags']`, ~lines 304–306) `apps/vscode/src/services/stacService.ts`
- [ ] T017 Re-type the mutation-path local from `item.properties as Record<string, unknown>` to `StacItemProperties` (line ~1315); remove the `as Record<string, unknown>` cast **and** the `eslint-disable … ADR-011` comment (line ~1314); confirm the arbitrary-key loop `props[k] = v` over `Object.entries(patch)` and the modelled-key writes (`props['debrief:overrides']`, `props['debrief:provenance_log']`) still type-check, dropping their `as unknown[]` / `as PropertiesProvenanceEntry[]` casts (FR-012) `apps/vscode/src/services/stacService.ts`
- [ ] T018 Remove the hand-cast `asset as StacAsset & { 'debrief:toolId'?: string }` (~line 674) and read `asset['debrief:toolId']` via the modelled `StacAsset` slot; confirm asset writers (`addResultAsset` callers, `writeSnapshotAsset`) type-check against the new slots (FR-011 / SC-007) `apps/vscode/src/services/stacService.ts`

### Implementation for User Story 2 — web-shell host

- [ ] T019 Re-type the mutation-path local from `Record<string, unknown>` to `StacItemProperties` (line ~309: `const props: StacItemProperties = { ...baseItem.properties }`); drop the `as unknown[]` / `as PropertiesProvenanceEntry[]` casts on `props['debrief:overrides']` / `props['debrief:provenance_log']`; confirm the spread + arbitrary writes still type-check (FR-012 / FR-009) `apps/web-shell/src/services/stacWriterIdb.ts`

### Verify

- [ ] T020 Run `pnpm -r typecheck` (clean) and the writer unit suites (`pnpm --filter '!@debrief/web-shell' test` for vscode/stacService specs); confirm no behavioural change `apps/vscode/tests/unit/stacService.test.ts`

**Checkpoint**: Both hosts type-check modelled `debrief:*` read **and** write
access (incl. asset-level) against LinkML; all redundant casts + both widenings +
the asset hand-cast are gone; runtime behaviour unchanged.

## Phase 5: User Story 3 (P3) — Close the #240-deferred Article II.1 audit + on-disk invariance

**Story goal**: The writer's modelled `debrief:*` surface no longer flows through
a hand-typed `Record<string, unknown>` bag, and the #240 audit deferral is
recorded as closed (SC-006). Prove the change is behaviour-preserving (FR-008 /
SC-004) and the new `StacAsset` slots round-trip (Article II.2).

**Independent test**: Audit the writer's `debrief:*` access surface — every
modelled key resolves to a LinkML-derived type; the #240 deferral note no longer
describes open work.

### Tests for User Story 3

- [ ] T021 [P][test] Byte-identical write golden: a write through the writer for the Phase-1 baseline input produces on-disk JSON byte-for-byte identical to `baseline-item-before.json`, including the asset-level `debrief:toolId` / `debrief:snapshotTimestamp` keys (FR-008 / SC-004) `shared/schemas/tests/test_stac_roundtrip.py`
- [ ] T022 [P][test] `StacAsset` adherence / round-trip for the two new slots — Python → JSON → TypeScript → JSON preserves `debrief:toolId` + `debrief:snapshotTimestamp` (Article II.2) `shared/schemas/tests/test_stac_roundtrip.py`

### Implementation for User Story 3

- [ ] T023 Update the #240 deferral reference to record closure (Article II.1 audit), and add an ADR / decision note describing the schema-driven prefix mechanism and the `debrief:label` exclusion rationale `docs/project_notes/decisions.md`
- [ ] T024 [P] Log the work item with ticket ID + PR URL `docs/project_notes/issues.md`

**Checkpoint**: On-disk invariance proven; new asset slots round-trip; #240
deferral closed and documented.

## Phase 6: Polish & Cross-Cutting Concerns

### Full gate

- [ ] T025 Run the full CI gate (`task verify` — lint + typecheck + pytest + vitest) and confirm the `src/generated` drift gate passes with the committed artefacts `specs/256-prefix-aware-stac-typing/tasks.md`

### Evidence Collection

- [ ] T026 Capture test results using the template (`.specify/templates/evidence/test-summary-template.md`) with YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`) `specs/256-prefix-aware-stac-typing/evidence/test-summary.md`
- [ ] T027 [P] Finalise the usage demonstration — before/after writer snippets (read cast removal, write-path re-type, asset access) with the FR-002 add-a-field transcript `specs/256-prefix-aware-stac-typing/evidence/usage-example.md`
- [ ] T028 [P] Write the round-trip / byte-invariance proof (Python → JSON → TS → JSON; byte-identical write golden; new `StacAsset` keys preserved) `specs/256-prefix-aware-stac-typing/evidence/round-trip-evidence.md`
- [ ] T029 [P] Capture the generated `types.ts` 3-class before/after diff and the clean drift-gate output `specs/256-prefix-aware-stac-typing/evidence/generated-diff.md`

### Media Content

- [ ] T030 Create the feature blog post via the Content Specialist agent (`.claude/agents/media/content.md`): title prefixed `Building `, first three sections copied verbatim from `evidence/opening-context.md`, remaining sections (By the Numbers, Lessons Learned, What's Next) written from evidence `specs/256-prefix-aware-stac-typing/media/shipped-post.md`

### PR Creation

- [ ] T031 Create PR and publish blog: run `/speckit.pr` (updates the already-open PR #663 with evidence + publishes `shipped-post.md` to debrief.github.io) `specs/256-prefix-aware-stac-typing/tasks.md`

**Task T031 must run last. It depends on every evidence + media task being complete.**

## Dependencies

**Phase order**: Setup (P1) → **Foundational (P2)** → US1 (P3) → US2 (P4) →
US3 (P5) → Polish (P6).

- **Phase 2 (Foundational) blocks everything.** T005→T006→T007 are sequential
  (same file, build on each other); T004 (schema) must precede T008 (regen);
  T008 precedes T009 (commit). No story task may start until T009 is done.
- **US1 (Phase 3)** depends only on Phase 2. T010–T012 are `[P]` (different
  assertions; T010/T011 share one new file but are written together). T013
  (worked demo) depends on the committed regen.
- **US2 (Phase 4)** depends on Phase 2 (typed `types.ts`). T016 is `[P]` (read
  sites). T017/T018 are sequential (same file region of `stacService.ts`). T019
  is `[P]` with the VS Code tasks (different file). T014/T015 (type-level tests)
  can be written first (TDD) but only **pass** after T016–T019. T020 verifies.
- **US3 (Phase 5)** depends on Phase 2; T021/T022 best run after US2 (casts
  removed) to prove invariance held through the refactor. T023/T024 are docs.
- **Polish (Phase 6)**: T025 depends on all implementation + tests. T026–T029
  evidence (`[P]` among themselves). T030 (post) after evidence. **T031 last.**

**Story independence**: US1 (does a new field flow?), US2 (do typos fail?), and
US3 (is the bag gone + bytes unchanged?) are each independently testable once
Phase 2 lands — they verify different guarantees over the same generated surface.

## Implementation Strategy

**MVP = Phase 2 + Phase 3 (US1).** Landing the schema-driven transform across the
three classes, the `StacAsset` slots, and the FR-002 proof delivers the core
#240-deferred promise — new `debrief:*` fields flow to the typed surface
automatically. This is shippable on its own.

**Incremental delivery**:
1. **Foundation** (Phase 2) — the engine: schema change + one schema-driven
   generator step + regen. Drift-gate green.
2. **US1** (Phase 3) — prove automatic flow with a pure-function unit test +
   convention guard. *Checkpoint: the headline guarantee is in CI.*
3. **US2** (Phase 4) — realise the developer-facing payoff: remove casts +
   widenings + asset hand-cast; type-level tests make read **and** write typos
   fail the build. *Checkpoint: the silent-drop class is closed on both paths.*
4. **US3** (Phase 5) — prove behaviour invariance + close the #240 audit.
5. **Polish** (Phase 6) — evidence, blog post, PR.

**Risk notes**:
- The single highest-value, highest-risk change is **T017/T019 (write-path
  re-typing)** — it's the part the naive generated-type change misses. Verify
  the arbitrary-key write paths (`props[k] = v`) still compile against
  `StacItemProperties`'s `[key: string]: unknown` index signature before
  declaring done.
- T007's `RuntimeError` self-guards are mandatory — without them a future
  `gen-typescript` change could silently revert to bare keys (the convention
  guard test T011 is the backstop).
- Keep the transform a **pure function** (T005) so T010 can prove FR-002 without
  a full regen.
