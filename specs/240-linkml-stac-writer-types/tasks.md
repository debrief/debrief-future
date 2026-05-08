# Tasks: LinkML-derive `@debrief/stac-writer` contract types

**Feature**: 240-linkml-stac-writer-types
**Branch**: `claude/start-speckit-240-DixZc` (cloud session); spec dir `specs/240-linkml-stac-writer-types/`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md) | **Quickstart**: [quickstart.md](./quickstart.md)

This task list executes the post-`/speckit.review` plan. The originally-planned `StacItem.properties` typing has been deferred to backlog #256; this feature ships the `PropertiesProvenanceEntry` consolidation (via hybrid intersection) plus the CI drift gate.

## Evidence Requirements

**Evidence Directory**: `specs/240-linkml-stac-writer-types/evidence/`
**Media Directory**: `specs/240-linkml-stac-writer-types/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `test-summary.md` | Aggregate test results (Python `test_roundtrip.py` + TS `pnpm -r typecheck` + existing unit tests + new TS-side smoke test) using `.specify/templates/evidence/test-summary-template.md` with YAML front matter (feature, captured_at, git_sha, tests_passed/failed/skipped, coverage_pct) | After Phase 4 completes |
| `usage-example.md` | Walkthrough: a developer adds a new optional attribute to the `PropertiesProvenanceEntry` LinkML class, runs `task schema:generate`, sees the attribute appear on the generated TS type and on the components-side hybrid intersection's `Pick<>` accessors — with no hand-edits to writer-side files | After implementation |
| `before-after-types.md` | Side-by-side TypeScript snippets showing the three pre-migration hand-written declarations and the post-migration single canonical body + hybrid intersection. Concrete proof of SC-002 (one body declaration left). | After implementation |
| `generator-determinism-evidence.md` | Output of running `task schema:generate` twice on a clean checkout with `git diff --quiet` after each. Pass/fail signal for SC-007. If non-determinism was found and a normalisation pass added, includes pre/post output. | After Phase 1 (gates everything else) |
| `drift-gate-evidence.md` | Terminal log of the deliberate-drift acceptance walkthrough (quickstart Step 9): hand-edit a generated file, push, CI fails on the new step, message names `task schema:generate`. Includes link to the failed CI run. Cleaned up after capture. | After Phase 4 |
| `round-trip-evidence.md` | Output of `uv run pytest shared/schemas/tests/test_roundtrip.py -v` plus the new TS-side smoke test (parses every item under `preview/workspace/samples/local-store/` against `StacItem` and validates each `provenance_log` entry). Pass/fail signal for SC-004. | After Phase 3 |
| `audit-evidence.md` | Output of the repo-wide grep audit (quickstart Step 10) showing exactly one `interface PropertiesProvenanceEntry { ... }` body remains (in the LinkML-generated TS), with type-alias re-exports in the writer and components packages. Concrete proof of SC-005. | After implementation |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener (Hook + What We're Building + How It Fits + Key Decisions) | Already captured during `/speckit.plan` (commit `d1c50c5`) |
| `media/shipped-post.md` | Feature post: copies the four sections from `evidence/opening-context.md` verbatim, adds Lessons Learned (any non-determinism findings, ESLint rule placement) and What's Next (links to backlog items #256 and #257) | Phase 5 |

**No screenshots, no interaction GIF.** This is a backend / type-derivation feature with zero visual surface.

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | Standard PR in `debrief/debrief-future` referencing the evidence artefacts above | Final task |
| Blog PR | Cross-repo PR in `debrief/debrief.github.io` publishing `media/shipped-post.md` | Triggered by `/speckit.pr` |

## Phase 1: Setup — Generator determinism gate (P0)

**Goal**: Verify that the LinkML generators (`gen-typescript`, `gen-pydantic`, `gen-json-schema`) produce byte-identical output across two consecutive runs against the same input. The CI drift check (Phase 4) is unsafe to ship until this passes — a non-deterministic gate is worse than no gate (Article VI.4).

**Independent test**: Running `task schema:generate` twice in succession on a clean checkout MUST produce zero `git diff` under `shared/schemas/src/generated/`. Captured in `evidence/generator-determinism-evidence.md`.

- [ ] T001 Verify generator determinism (SC-007). On a clean checkout with `git status --porcelain shared/schemas/src/generated/` empty, run `cd shared/schemas && uv run python scripts/generate.py` once and assert `git diff --quiet -- src/generated/`; run it a second time and assert the same. If either diff is non-empty, identify the source (most likely candidates: dictionary key order in `PYTHON_OUT/__init__.py`; embedded timestamp in a generator header) and either fix at the generator level or add a normalisation pass (`prettier --write` for `.ts`, `ruff format` for `.py`) into `shared/schemas/scripts/generate.py` after each emit. Re-verify until both diffs are quiet. Capture a transcript at `specs/240-linkml-stac-writer-types/evidence/generator-determinism-evidence.md`. Do **not** start Phase 2 until this passes.

**Phase gate**: Phase 2 cannot begin until T001 reports determinism. If T001 finds non-determinism that requires a normalisation pass, the normalisation change lands as part of T001 and is committed alongside the rest of this feature.

## Phase 2: Foundation — Workspace boundary

**Goal**: Establish the workspace dependency edge `@debrief/stac-writer → @debrief/components` (type-only, via the existing `./PropertiesPanel/provenanceTypes` subpath leaf), the ESLint rule that keeps it type-only, and the `.gitattributes` marker that collapses generated files in PR diff views. These are independent file edits and run in parallel.

**Independent test**: After this phase, `pnpm install` resolves the workspace edge cleanly; an attempt to `import { someRuntimeSymbol } from '@debrief/components'` from any file under `shared/stac-writer/` fails ESLint; opening a PR that touches `shared/schemas/src/generated/types.ts` collapses that file in the diff view by default.

### Independent file edits — run in parallel

- [ ] T002 [P] Add `@debrief/components` to writer's workspace dependencies `shared/stac-writer/package.json`. Specifically: under `dependencies`, add `"@debrief/components": "workspace:*"`. Run `pnpm install` from the repo root afterwards and verify `pnpm-lock.yaml` records the new edge.
- [ ] T003 [P] Add `no-restricted-imports` ESLint override scoped to `shared/stac-writer/**` `.eslintrc.cjs` (or wherever the workspace ESLint config lives — check `eslint.config.mjs`, `.eslintrc.json`, or `package.json#eslintConfig` first). Pattern: ban runtime imports from `@debrief/components` and any of its subpaths in files matching `shared/stac-writer/**/*.ts`. Type-only imports (`import type { ... }`, `export type { ... } from`) MUST remain allowed — `@typescript-eslint/no-restricted-imports` supports a `allowTypeImports: true` option. Failure message: "Runtime imports from @debrief/components are banned in @debrief/stac-writer to keep the writer's runtime dep graph minimal. Use `import type` for types; for runtime symbols, route through a different path or open an issue."
- [ ] T004 [P] Add `linguist-generated=true` for generated artefacts `.gitattributes`. Append a single line: `shared/schemas/src/generated/** linguist-generated=true`. Verify the file's existing content is preserved.

### Verification

- [ ] T005 Verify Foundation gates pass (no file edits). Run `pnpm install`, then `pnpm -r typecheck` (must still pass — no source changes have happened yet so this is a regression check), then `pnpm lint` (must pass — the ESLint rule does not yet have a violator since the writer hasn't started importing from components). Confirm `git diff .gitattributes` shows only the new line.

**Phase gate**: T005 must report green before Phase 3 begins. If `pnpm -r typecheck` fails here, something else is broken — investigate before introducing source changes.

## Phase 3: User Story 1 — Single canonical `PropertiesProvenanceEntry` shape (P1)

**Story goal** (from spec.md Story 1): Find exactly one *body* declaration of the per-entry provenance shape — the LinkML class — instead of three divergent hand-written TypeScript declarations. The components-side declaration becomes a hybrid intersection that re-exports the LinkML-generated type and statically narrows `tool`/`method`/`source` to literal types (preserving today's compile-time guard at the production write sites).

**Independent test criteria**:

1. Repository-wide grep for `interface PropertiesProvenanceEntry` finds exactly one match — the LinkML-generated `interface` body in `shared/schemas/src/generated/typescript/types.ts`.
2. `pnpm -r typecheck` passes — every consumer compiles.
3. The two production write sites (`apps/vscode/src/services/stacService.ts:1326` and `apps/web-shell/src/services/stacWriterIdb.ts:335`) continue to type-check with literal `tool`/`source` values, confirming the hybrid intersection preserves the compile-time guard.
4. The Python round-trip test (`shared/schemas/tests/test_roundtrip.py`) and the existing TS unit tests (`apps/vscode/tests/unit/stacService.{provenanceRotation,updateItemMetadata}.test.ts`) all pass with no test-file edits required.

### Source changes — sequential (each task touches the next dependency in the chain)

- [ ] T006 Replace local `interface PropertiesProvenanceEntry { ... }` (lines 9–22) with the hybrid intersection in `shared/components/src/PropertiesPanel/provenanceTypes.ts`. After the existing leading comment + `PROPERTIES_PANEL_TOOL_SENTINEL` constant, insert:
   ```typescript
   import type { PropertiesProvenanceEntry as Generated } from '@debrief/schemas';

   export type PropertiesProvenanceEntry =
     Omit<Generated, 'tool' | 'method' | 'source'> &
     {
       tool: typeof PROPERTIES_PANEL_TOOL_SENTINEL;
       method: `properties-panel@${string}`;
       source: 'user';
     };
   ```
   Delete the existing `interface` body (lines 9–22). The `isValidPropertiesProvenanceEntry()` function (lines 28–45), the `PROVENANCE_LOG_CAP` and `PROVENANCE_LOG_ARCHIVE_FILENAME` constants, and the `PROPERTIES_PANEL_TOOL_SENTINEL` constant all stay verbatim. Update the file's leading docstring to read: "Provenance entry shape + archive constants shared between webview and extension-side stacService. Type sourced from LinkML (`shared/schemas/src/linkml/stac-extension.yaml`); literal-string narrowing on tool/method/source reinstated here via a hybrid intersection because LinkML's `gen-typescript` cannot translate `pattern` into TS literal types."

- [ ] T007 Delete hand-written `interface PropertiesProvenanceEntry { ... }` (lines 42–49) from `shared/stac-writer/src/interface.ts`. Replace with a single re-export immediately after the `StacAsset` interface and before the `// ─── Capability ───` divider:
   ```typescript
   export type { PropertiesProvenanceEntry } from '@debrief/components/PropertiesPanel/provenanceTypes';
   ```
   The existing `StacItem` interface (lines 34–40) MUST remain unchanged — that's deferred per `/speckit.review` decision 1. The `PatchItemInput.provenance: Pick<PropertiesProvenanceEntry, 'tool' | 'fields'>` (line 81) continues to work because the re-exported type still has those slots.

### Verification — parallel where independent

- [ ] T008 [P] Run repository-wide audit confirming exactly one `interface` body remains. From repo root: `grep -rn "interface PropertiesProvenanceEntry\b\|type PropertiesProvenanceEntry =" --include='*.ts' --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build shared apps services`. Expect exactly three matches — the canonical `interface` in `shared/schemas/src/generated/typescript/types.ts`, the `type` alias in `shared/components/src/PropertiesPanel/provenanceTypes.ts`, and the `export type` re-export in `shared/stac-writer/src/interface.ts`. (Spec-only matches under `specs/193-properties-panel/contracts/` are historical contract files frozen by their spec — exclude or note them.) Capture the grep output at `specs/240-linkml-stac-writer-types/evidence/audit-evidence.md`.
- [ ] T009 [P] Run workspace typecheck `pnpm -r typecheck`. Must pass for `@debrief/components`, `@debrief/stac-writer`, `apps/vscode`, `apps/web-shell`, and `apps/web-shell` tests. Particular attention to `apps/vscode/src/services/stacService.ts:1323-1330` (the entry construction with `tool: PROPERTIES_PANEL_TOOL_SENTINEL`, `method: \`properties-panel@${packageVersion}\``, `source: 'user'`) — these MUST type-check, proving the hybrid intersection preserves the compile-time guard. Same for `apps/web-shell/src/services/stacWriterIdb.ts:332-339`.
- [ ] T010 [P] [test] Run existing TypeScript unit tests `apps/vscode/tests/unit/stacService.provenanceRotation.test.ts` and `apps/vscode/tests/unit/stacService.updateItemMetadata.test.ts`. Both files import `PropertiesProvenanceEntry` and `isValidPropertiesProvenanceEntry` from `@debrief/components/PropertiesPanel/provenanceTypes`; with the type now flowing from LinkML (via the intersection), they exercise the migrated path end-to-end. Run via `pnpm --filter @debrief/vscode test`. All assertions must pass.
- [ ] T011 [P] [test] Run Python round-trip test `cd shared/schemas && uv run pytest tests/test_roundtrip.py -v`. The test exercises the LinkML-generated Pydantic model against the existing fixtures, including `PropertiesProvenanceEntry`. Capture the output at `specs/240-linkml-stac-writer-types/evidence/round-trip-evidence.md` (Python half).
- [ ] T012 [P] [test] Add a TS-side smoke test that loads every item under `preview/workspace/samples/local-store/`, parses against `StacItem`, and validates each `properties['debrief:provenance_log']` entry against `isValidPropertiesProvenanceEntry` `apps/web-shell/src/services/__tests__/stacWriterIdb.roundtrip.test.ts` (or the closest existing test directory in `apps/web-shell` — confirm location during the task). The test reads each `item.json` from the sample catalog, asserts it parses without exception, and for any item carrying a `provenance_log` asserts every entry passes the validator. This is a hedge against the workspace dep edge or ESLint rule accidentally breaking the writer's build, not a new behavioural guarantee. Capture the output at `specs/240-linkml-stac-writer-types/evidence/round-trip-evidence.md` (TS half — append to T011's file).

**Phase gate**: T008–T012 must all pass before Phase 4 begins. If T009 fails on a literal-string assignment in the writer or its consumers, the hybrid intersection is malformed — re-check T006 against the contract in `contracts/stac-writer-public-types.md` §3.

## Phase 4: User Story 2 — Drift detection in CI (P2)

**Story goal** (from spec.md Story 2): A PR that hand-edits a generated artefact under `shared/schemas/src/generated/` fails CI within one pipeline run, with a failure message naming the regeneration command. Local contributors run the equivalent check via `task schema:check-drift`.

**Independent test criteria**:

1. The new step exists in `.github/workflows/schema-tests.yml` after the existing `Run schema generation` step.
2. `task schema:generate` and `task schema:check-drift` are runnable from repo root and behave per their semantics (regenerate vs. check-only).
3. A deliberate hand-edit to a generated file, pushed on a throwaway branch, fails CI on the new step within one schema-tests run.

### Independent file edits — run in parallel

- [ ] T013 [P] Add `Check generated artefacts are up-to-date` step to `.github/workflows/schema-tests.yml`. Insert after the existing `- name: Run schema generation` step (line ~38) and before the `- name: Run golden fixture tests` step. Use the contract in `contracts/stac-writer-public-types.md` §5:
   ```yaml
   - name: Check generated artefacts are up-to-date
     run: |
       if ! git diff --exit-code -- src/generated/; then
         echo "::error::Generated artefacts under shared/schemas/src/generated/ have drifted from the LinkML source."
         echo "::error::Run 'task schema:generate' (or 'cd shared/schemas && uv run python scripts/generate.py') and commit the result."
         exit 1
       fi
   ```
   The step inherits `working-directory: shared/schemas` from the `defaults` block at the top of the workflow, so `-- src/generated/` resolves correctly relative to that directory.
- [ ] T014 [P] Add `schema:generate` and `schema:check-drift` Taskfile targets `Taskfile.yml`. Add to the existing `tasks:` map (alphabetised — fits between `schema:docs:*` (line 149) and any later schema tasks). The targets MUST be runnable from repo root:
   ```yaml
   schema:generate:
     desc: "Regenerate Pydantic, JSON Schema, and TypeScript artefacts from LinkML"
     cmds:
       - cd shared/schemas && uv run python scripts/generate.py

   schema:check-drift:
     desc: "Verify generated artefacts under shared/schemas/src/generated/ match a fresh regeneration"
     deps: [schema:generate]
     cmds:
       - |
         if ! git diff --quiet -- shared/schemas/src/generated/; then
           echo "::error::Generated artefacts have drifted. Run 'task schema:generate' and commit the result."
           git --no-pager diff --stat -- shared/schemas/src/generated/
           exit 1
         fi
   ```

### Verification

- [ ] T015 Confirm Taskfile targets work locally `task schema:generate` followed by `task schema:check-drift`. Both must exit 0 on a clean checkout. If `schema:check-drift` fails, T001's determinism guarantee has regressed — investigate and fix before continuing.
- [ ] T016 Provoke the drift check (negative-path acceptance walkthrough — quickstart Step 9) on a throwaway branch. Steps:
   1. `git checkout -b throwaway/240-drift-check-probe`.
   2. Hand-edit any generated file under `shared/schemas/src/generated/typescript/types.ts` (e.g. flip a property type via `sed`).
   3. Commit and push: `git push -u origin throwaway/240-drift-check-probe`.
   4. Open a PR via `gh pr create --fill --base main --draft` (draft so it doesn't trigger reviewers).
   5. Wait for the Schema Tests workflow to run; expect it to fail at the new `Check generated artefacts are up-to-date` step with the message naming `task schema:generate`.
   6. Capture the failure log + the URL of the failed CI run at `specs/240-linkml-stac-writer-types/evidence/drift-gate-evidence.md`.
   7. Cleanup: close the PR with `gh pr close --delete-branch <PR#>` (deletes the local branch and remote ref). Verify the branch is gone with `git branch -a | grep throwaway/240-drift-check-probe` returning nothing.

   **Pass**: CI fails on the new step within one workflow run; failure message contains "task schema:generate".
   **Fail**: CI passes despite the drift, OR fails on a different step. Investigate path filters in `schema-tests.yml` `paths:` block, or step ordering.

**Phase gate**: T013–T016 must all pass before Phase 5 begins. T016's evidence file is the proof of SC-003 ("A PR that hand-edits any generated artefact fails CI within one pipeline run").

## Phase 5: Polish & Cross-Cutting Concerns

**Goal**: Produce the evidence artefacts that demonstrate the feature works, write the feature blog post (extending the cached opener captured during `/speckit.plan`), and open the PR.

### Evidence Collection — parallel where independent

- [ ] T017 [P] Capture aggregate test results using template (`.specify/templates/evidence/test-summary-template.md`) at `specs/240-linkml-stac-writer-types/evidence/test-summary.md`. Aggregate from: T010 (vscode unit tests), T011 (Python round-trip), T012 (TS-side smoke test). YAML front matter MUST include `feature: 240-linkml-stac-writer-types`, `captured_at` (ISO timestamp), `git_sha` (output of `git rev-parse HEAD`), `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct` (use the existing test runs' coverage if reported; otherwise mark as `N/A — type-derivation feature, no coverage delta expected`). Body: total tests, passed, failed, key scenarios verified (literal-string narrowing at production write sites; round-trip on sample catalog; LinkML-driven type flow).
- [ ] T018 [P] Create usage demonstration showing the schema-driven flow `specs/240-linkml-stac-writer-types/evidence/usage-example.md`. Contents:
  1. Quote the canonical LinkML class lines (`stac-extension.yaml:63–110`).
  2. Show a hypothetical schema edit — e.g. tightening the `method` pattern from `^properties-panel@.+$` to `^properties-panel@\d+\.\d+\.\d+$`.
  3. Show the command: `task schema:generate`.
  4. Show the diff in `shared/schemas/src/generated/typescript/types.ts` (the `method` field's leading docstring updates).
  5. Show that the components-side hybrid intersection's `method: \`properties-panel@${string}\`` template literal still type-checks against the new constraint (template literal is a subtype of any string matching the new pattern provided the suffix is non-empty — which it is at the production write site).
  6. Show that no hand-edits to writer-side or components-side type bodies were required.
  7. Revert the LinkML edit and confirm the change reverts cleanly.
- [ ] T019 [P] Capture before/after type-surface snapshot `specs/240-linkml-stac-writer-types/evidence/before-after-types.md`. Side-by-side TypeScript snippets of:
  - Before: the three pre-migration hand-written declarations (writer's `interface.ts:42–49`, components' `provenanceTypes.ts:9–22`, plus the unused-by-anybody generated TS for context).
  - After: the post-migration single canonical body (still in `types.ts`) + hybrid intersection (in `provenanceTypes.ts`) + re-export (in writer's `interface.ts`).
  - Annotate the field-by-field reconciliation — particularly the `source` enum collapse from `'user' | 'tool' | 'import'` to `'user'` (R4).
- [ ] T020 [P] Round-trip evidence already captured by T011 + T012 — confirm `specs/240-linkml-stac-writer-types/evidence/round-trip-evidence.md` exists, has both Python and TS halves, and includes the count of items processed plus pass/fail tally per item. Add a one-line summary at the top: "All N items round-trip cleanly under the post-migration types."
- [ ] T021 [P] Generator-determinism evidence already captured by T001 — confirm `specs/240-linkml-stac-writer-types/evidence/generator-determinism-evidence.md` exists. Add a status header: "Pass — generator is byte-deterministic across two consecutive runs" OR "Pass with normalisation pass — required `prettier --write` integration in `scripts/generate.py`; pre/post runs both quiet after the pass." Include `git rev-parse HEAD` for traceability.
- [ ] T022 [P] Drift-gate evidence already captured by T016 — confirm `specs/240-linkml-stac-writer-types/evidence/drift-gate-evidence.md` exists, includes the URL of the failed CI run, the verbatim failure log line(s), and a note that the throwaway branch was cleaned up.
- [ ] T023 [P] Audit evidence already captured by T008 — confirm `specs/240-linkml-stac-writer-types/evidence/audit-evidence.md` exists with the grep output. Add a one-line summary: "Three matches — exactly one `interface` body (LinkML-generated) plus two `type` aliases delegating to it. SC-005 cleared."

### End-to-End Validation

- [ ] T024 Run `task verify` from repo root (the project-wide CI-equivalent). All of `task lint`, `task typecheck`, `task test` MUST pass green. If any fails, fix before proceeding to media / PR. Capture the final pass output as the closing line of `specs/240-linkml-stac-writer-types/evidence/test-summary.md` ("`task verify` passes on commit `<sha>`").

### Media Content

- [ ] T025 Create feature blog post via Content Specialist agent `specs/240-linkml-stac-writer-types/media/shipped-post.md`. Spawn the `content-specialist` subagent (`.claude/agents/media/content.md`) with:
  - The full contents of `specs/240-linkml-stac-writer-types/evidence/opening-context.md` (the cached opener — must be copied **verbatim** as the first four sections: Hook, What We're Building, How It Fits, Key Decisions).
  - Pointers to: `evidence/before-after-types.md` (the consolidation proof), `evidence/drift-gate-evidence.md` (the CI gate proof), `evidence/test-summary.md` (the test results), and the two follow-up backlog items (#256 prefix-aware typing, #257 read-path validation).
  - Title: `Building LinkML-Derived `@debrief/stac-writer` Types`.
  - Required additional sections AFTER the cached opener:
    - **By the Numbers** — files modified, lines diff stats, generator runs, time-to-regenerate, count of pre-existing hand-written declarations consolidated.
    - **Lessons Learned** — at minimum: (a) the prefix-stripping discovery that surfaced during review and reshaped scope; (b) whether generator determinism required a normalisation pass (per T001 evidence). Honest about the deferral — this feature only consolidated half of what the original spec promised.
    - **What's Next** — links to backlog items #256 (prefix-aware typing) and #257 (read-path validation).
  - **No** screenshots, **no** interaction GIF, **no** "try it yourself in Storybook" CTA.
  - Front matter MUST include the standard Future Debrief blog YAML (title, date, tags). Use prior shipped posts (e.g. those at `debrief.github.io` linked from previous specs) as the template.

### PR Creation

- [ ] T026 Create PR and publish blog: run `/speckit.pr`. This task MUST be the final task. It:
  - Creates the feature PR in `debrief/debrief-future` referencing the spec dir, the seven evidence artefacts, and the cached opener.
  - Cross-publishes `media/shipped-post.md` to `debrief/debrief.github.io` as a paired PR.
  - Returns both PR URLs for review.

  **Dependencies**: T001 through T025 must all be complete and committed before T026 runs. The PR description MUST link the BACKLOG.md follow-up entries for #256 and #257 so the deferred scope is durable.

## Dependencies

### Phase order

```
Phase 1 (T001 — generator determinism gate)
   │
   ▼
Phase 2 (T002, T003, T004 — workspace boundary [P]; T005 — verify)
   │
   ▼
Phase 3 (Story 1)
   T006 (hybrid intersection)  →  T007 (delete writer's declaration)
                                    │
                                    ▼
                             T008/T009/T010/T011/T012 (verify [P])
   │
   ▼
Phase 4 (Story 2)
   T013, T014 (file edits [P])  →  T015 (local check)  →  T016 (CI walkthrough)
   │
   ▼
Phase 5 (Polish)
   T017–T023 (evidence collection [P])  →  T024 (task verify)  →  T025 (blog post)  →  T026 (PR — final)
```

### Story dependencies

- **Story 2 depends on Story 1**: The drift gate (Phase 4) only makes sense with the migrated types in place (Phase 3). Adding the gate against today's main would fire on every legitimate schema regen until Phase 3 lands.
- **Story 1 does NOT depend on Story 2**: Phase 3 could ship without Phase 4 and still deliver value (the consolidation half), but Story 2 is what prevents recurrence — both ship together to honour the spec's "long-term durability" promise.
- **Phase 1 gates everything**: If T001 reveals generator non-determinism that requires a normalisation pass, every later phase runs against the post-normalisation generator output, not the pre-normalisation output.

### Within-phase parallelism

| Phase | Parallel group | Why parallel |
|-------|---------------|--------------|
| 2 | T002, T003, T004 | Independent files (`package.json`, ESLint config, `.gitattributes`); T005 verifies the union after all three land |
| 3 (verify) | T008, T009, T010, T011, T012 | All read-only checks against the same source state; no write contention |
| 4 (edit) | T013, T014 | Independent files (workflow YAML, Taskfile YAML); T015 verifies the union |
| 5 (evidence) | T017–T023 | Independent evidence files; some (T020, T021, T022, T023) are confirmation-only against earlier outputs |

### Sequential pinch points

- **T006 → T007**: T007 imports the type that T006 defines. Reversing breaks tsc.
- **T015 → T016**: Local `task schema:check-drift` must pass before provoking the CI walkthrough — a local failure here would mask the drift detection's behaviour on a real PR.
- **T024 → T025**: Blog post should reference test results, so `task verify` must pass before the post is written.
- **T025 → T026**: PR description references the blog post path; PR opens with the post already written.

## Implementation Strategy

### Incremental delivery

This feature delivers value incrementally in two halves:

1. **After Phase 3 (Story 1, P1)**: Three divergent declarations of `PropertiesProvenanceEntry` collapse to one canonical body + two re-exports. The spec's primary user-story is satisfied; existing tests continue to pass; no consumer needs to change. *If this feature were time-boxed and Phase 4 had to ship later, this would be the cut point.*

2. **After Phase 4 (Story 2, P2)**: The drift gate locks the consolidation in place. Future contributors who hand-edit a generated file will find their PR fails CI before any test runs. This is the "long-term durability" half of the spec.

3. **After Phase 5 (Polish)**: Evidence + blog post + PR. The blog post's "What's Next" section makes the deferred scope (#256 prefix-aware typing, #257 read-path validation) visible to readers, so the half-delivered promise is acknowledged honestly.

### Estimated effort

- Phase 1: 0.5 dev-day (1–2 hours if generator is deterministic; up to half a day if a normalisation pass is needed).
- Phase 2: 0.25 dev-day (three small file edits + verification).
- Phase 3: 0.5 dev-day (two source edits + five verification steps; mostly mechanical).
- Phase 4: 0.5 dev-day (two file edits + one CI walkthrough on a throwaway branch).
- Phase 5: 0.5 dev-day (evidence assembly mostly automatic from earlier outputs; blog post via Content Specialist).
- **Total**: ~2 dev-days (within the 1–2 dev-day estimate recorded in the BACKLOG.md row 240 update).

### Risk register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Generator turns out to be non-deterministic (T001 fails) | Low — existing `// AUTO-GENERATED — DO NOT EDIT` header suggests it's deterministic, but unverified | Add `prettier --write` (TS) / `ruff format` (Py) normalisation pass to `scripts/generate.py`; verify the normalised output is itself byte-stable; re-run T001 |
| `pnpm -r typecheck` fails at T009 because a consumer relied on a literal-string narrowing the hybrid intersection didn't preserve | Low — the intersection mirrors the existing literal types exactly | Re-check T006 against `contracts/stac-writer-public-types.md` §3; confirm the `Omit<>` and `&` clauses match; check the `tool` literal is `typeof PROPERTIES_PANEL_TOOL_SENTINEL`, not the bare string |
| ESLint rule (T003) over-blocks legitimate type-only imports | Medium — the syntax for `allowTypeImports: true` varies by ESLint plugin version | Check the workspace's ESLint plugin versions before drafting the rule; test against a contrived import in the writer; if ambiguity remains, add an inline `// eslint-disable-next-line` exception with a TODO referencing this risk |
| CI walkthrough (T016) hits an unrelated CI flake | Low | Re-run; if the flake is in the new step itself, debug the workflow YAML; if elsewhere, mark T016 evidence with the run that genuinely fired the new step |
| Blog post overclaims the deferred scope | Medium — agents can be optimistic | T025 explicitly requires "Honest about the deferral" in Lessons Learned; review the post against `evidence/opening-context.md` for tone before T026 |
