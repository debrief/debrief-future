# Tasks: Consolidate bounds utilities into @debrief/utils

**Feature**: 200-bounds-consolidation (v2)
**Inputs**: spec.md v2, plan.md v2, research.md (R1–R7), data-model.md, contracts/bounds-utility.md, quickstart.md

---

## Evidence Requirements

**Evidence Directory**: `specs/200-bounds-consolidation/evidence/`
**Media Directory**: `specs/200-bounds-consolidation/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `test-summary.md` | vitest results with counts + coverage, YAML front matter | After Phase 6 passes |
| `usage-example.md` | Before/after snippet of `mapPanel.ts::fitToSelection` — the one-line replacement | After T016 lands |
| `before-after-fittoselection.md` | Side-by-side diff of the ~35-line inline loop vs. the post-change one-line call | After T016 lands |
| `narrowing-gate-source.md` | Source snippet of `coerceCoordinates` + Article XV.5 comment | After T003 lands |
| `canonical-grep.txt` | Output of the SC-001 grep proving exactly one `calculateBounds` / `mergeBounds` definition under `shared/utils/` + `apps/` | After Phase 3 lands |
| `geometry-type-matrix.md` | Which geometry types are covered by unit tests, with the assertions for each | After T007 lands |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/planning-post.md` | v2 planning post | Created during `/speckit.plan` |
| `media/linkedin-planning.md` | v2 LinkedIn planning summary | Created during `/speckit.plan` |
| `media/shipped-post.md` | Shipped post celebrating completion | Created during Polish phase |
| `media/linkedin-shipped.md` | LinkedIn shipped summary | Created during Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief-future` carrying the consolidation + `fitToSelection` fix, with evidence | Final task (Polish phase) |
| Blog PR | PR in `debrief.github.io` publishing `shipped-post.md` | Triggered by `/speckit.pr` |

**Feature-type note**: This is a Library/SDK + consumer refactor. No UI screenshots are planned — the only user-visible surface is the VS Code map's auto-zoom, which is (a) preserved unchanged on the plot-open path, and (b) silently improved on the selection-zoom path. Evidence is text-based (source snippets, grep output, test counts, diff comparison) — appropriate for a Library/SDK feature per the Quality Rubric.

---

## Phase 1: Setup

**Goal**: Prerequisites that unblock every downstream phase. No code changes yet.

- [x] T001 Pre-flight grep sweep of `apps/vscode/` for any consumer of `../utils/bounds` or of the symbols `calculateBounds` / `mergeBounds` that research R3 did not enumerate; record the exhaustive consumer set as a comment in this file before deletion tasks fan out `specs/200-bounds-consolidation/evidence/preflight-grep.txt`
- [x] T002 [P] Capture the four deferred backlog items (drift-prevention rule, shared/components unification, LinkML-ify SafeFeature/GeoJSONFeature, bbox fast-path) as new entries in the backlog `BACKLOG.md`

**Parallel execution**: T001 is a prerequisite for Phase 2 (you can't widen until you know the consumer set is what the spec claims). T002 is fully independent of everything else in this PR and can run alongside Phase 2.

## Phase 2: Foundation (Shared Code)

**Goal**: Everything in `@debrief/utils` that every user story depends on. This is the TDD-ordered backbone of the change — each task lands as its own commit so the commit graph tells the "widen → test-fails → guard-fixes" story per research R2.

**Independent test criteria**: After Phase 2, `pnpm --filter @debrief/utils test --run bounds` passes with: (a) all pre-change assertions still green; (b) new null-geometry regression green; (c) six per-geometry-type assertions green; (d) narrowing-gate shape-mismatch assertions green. No consumer-side change is required to run these.

- [x] T003 Widen `calculateBounds`'s parameter to the structural minimum `ReadonlyArray<BoundsInputFeature>` **and** introduce the `coerceCoordinates(raw: unknown): CoordinateTree | null` narrowing gate with the Article XV.5 comment — both land together because the widened type is only constitutional once the gate exists (research R1 + R6, FR-006 + FR-007) `shared/utils/src/bounds.ts`
- [x] T004 [P][test] Add narrowing-gate shape-mismatch assertions: `coordinates: "oops"`, `null`, `[]`, `[["x"]]` each yield `bounds === null` with no throw (FR-007, SC-009, contract C7) `shared/utils/tests/bounds.test.ts`
- [x] T005 [test] Add failing null-geometry regression assertion: input mixing `{ geometry: null }` + valid features currently throws `TypeError` — this assertion fails at this commit and passes after T006 (research R2 step 2, FR-002, SC-006, contract C5) `shared/utils/tests/bounds.test.ts`
- [x] T006 Lift the null-guard (`if (!feature.geometry) continue;`) into the canonical loop in `calculateBounds` — T005 now passes (research R2 step 3, FR-002, US2 AS-2) `shared/utils/src/bounds.ts`
- [x] T007 [P][test] Add six per-geometry-type correctness assertions (Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon) — each asserts `calculateBounds([featureWithGivenGeometryType])` returns the correct four-number tuple; these lock in FR-008's no-silent-miss guarantee at the canonical location (SC-007, contract C6) `shared/utils/tests/bounds.test.ts`
- [x] T008 [test] Diff `apps/vscode/tests/unit/bounds.test.ts` against `shared/utils/tests/bounds.test.ts`; migrate any unique assertion from the vscode copy into the shared file (research R5 mitigation — ensures no coverage is silently lost at deletion) `shared/utils/tests/bounds.test.ts`

**Parallel execution**: T004, T007, and T008 are all test-only edits to the same file and can be authored concurrently (one commit each). T005 and T006 are strictly sequential (T005 must fail before T006 makes it pass). T003 must land first — every other Phase 2 task depends on the widened signature being in place.

## Phase 3: US1 — Single canonical bounds utility (Priority: P1)

**Goal**: Retire the VS Code-local `bounds.ts` and its duplicate test; point `mapPanel.ts`'s plot-open path at `@debrief/utils`. After this phase, the monorepo contains exactly one `calculateBounds` / `mergeBounds` under `shared/utils/` + `apps/` (excluding the out-of-scope `shared/components` copy).

**Independent test criteria**: `grep -rn "export function calculateBounds" --include="*.ts" shared/utils/ apps/` returns exactly one match (in `shared/utils/src/bounds.ts`). `find apps/vscode -name 'bounds.ts' -o -name 'bounds.test.ts'` returns zero rows. The VS Code package still type-checks.

- [x] T009 Flip the plot-open-path import in `mapPanel.ts` from `'../utils/bounds'` to `'@debrief/utils'` (also adding `boundsToLeaflet` to the named imports in anticipation of T016; do NOT change the `fitToSelection` body yet — that's Phase 6) `apps/vscode/src/webview/mapPanel.ts`
- [x] T010 [P] Delete the VS Code-local bounds utility now that no consumer references it (FR-003) `apps/vscode/src/utils/bounds.ts`
- [x] T011 [P] Delete the duplicate VS Code bounds test file now that its coverage has been subsumed into `shared/utils/tests/bounds.test.ts` by Phase 2 (FR-004) `apps/vscode/tests/unit/bounds.test.ts`
- [x] T012 [test] Run the SC-001 + SC-002 grep commands and pipe the output to the canonical-grep evidence file — the captured output must show exactly one definition per symbol and zero `bounds.ts` / `bounds.test.ts` files in `apps/vscode/` (contract C1 + C2) `specs/200-bounds-consolidation/evidence/canonical-grep.txt`

**Parallel execution**: T010 and T011 are both pure deletions and are independent once T009 has landed (T009 removes the last in-tree importer of the file being deleted in T010). T012 is verification-only and runs after T010 + T011.

## Phase 4: US2 — VS Code map auto-zoom preserved (Priority: P1)

**Goal**: Verify that the plot-open path's auto-zoom behaves identically to the pre-change extension. The behavioural guarantee is locked in at the unit-test level by Phase 2 (T005 + T006 for the null-geometry case; T007 for per-geometry-type correctness); this phase is the user-level smoke test that confirms no regression crept in.

**Independent test criteria**: Opening a plot in the VS Code extension preview auto-zooms to the feature extent identically to the pre-change build. A plot whose feature collection contains at least one null-geometry feature still auto-zooms cleanly.

- [x] T013 [test] Manual smoke test per quickstart Step 6: open a sample plot in the VS Code extension, confirm map auto-zooms to the feature extent; if available, also open a plot containing a null-geometry feature and confirm the zoom still happens without throwing in the devtools console (SC-005, FR-012, contract C13) `specs/200-bounds-consolidation/evidence/plot-open-smoke.md`

**Parallel execution**: Nothing to parallelise — single verification task. Depends on Phase 3 being complete (the import flip must be in place).

## Phase 5: US3 — SafeFeature flow without casts (Priority: P2)

**Goal**: Verify that the widened parameter + narrowing gate let `SafeFeature[]` (and, later, `DebriefFeature[]` for Phase 6) flow into `calculateBounds` without `as`-casts at the call site, and that the narrowing gate is the single reviewable boundary for the `unknown` input.

**Independent test criteria**: `pnpm --filter apps/vscode typecheck` passes with no new errors. `grep -n "as " apps/vscode/src/webview/mapPanel.ts` near the `calculateBounds` call sites shows no newly-added cast. `grep -nE "\bany\b|as unknown as" shared/utils/src/bounds.ts` returns no output.

- [x] T014 [test] Run the VS Code package typecheck and confirm zero new errors versus the pre-change baseline; capture the command output and inspect the `mapPanel.ts` diff near the `calculateBounds(parseResult.features)` call site to confirm no `as`-cast was introduced (FR-006, US3 AS-1/AS-2, contract C4) `specs/200-bounds-consolidation/evidence/typecheck-output.txt`
- [x] T015 [test] Code-review inspection of `shared/utils/src/bounds.ts`: verify `coerceCoordinates` is the single named narrowing gate, that its definition has the Article XV.5 anchor comment, and that the file contains no `any` type and no `as unknown as X` double-cast pattern; capture the grep commands and outputs that back this up (FR-007, US3 AS-3, SC-009, contract C8) `specs/200-bounds-consolidation/evidence/narrowing-gate-source.md`

**Parallel execution**: T014 and T015 are independent verification tasks and can run concurrently once Phase 2 + Phase 3 are complete.

## Phase 6: US4 — fitToSelection honours every geometry type (Priority: P2)

**Goal**: Replace the ~35-line inline bounds loop in `mapPanel.ts::fitToSelection()` with a single call to the consolidated `calculateBounds` + `boundsToLeaflet`. After this phase, "zoom to selection" honours Point / LineString / Polygon / MultiPoint / MultiLineString / MultiPolygon — the previous silent miss on non-Point/non-LineString selections is fixed. Preserves the existing early-return for empty selections.

**Independent test criteria**: Selecting a Polygon-only set and invoking "zoom to selection" in the VS Code map zooms to the Polygon's extent (pre-change: did nothing or produced wrong viewport). Selecting a Point+LineString set zooms identically to pre-change behaviour (no regression). Empty-selection invocation leaves the viewport unchanged.

- [x] T016 Rewrite the body of `fitToSelection()`: remove the ~35-line inline loop over `selectedFeatures` with its hand-rolled min/max tracking; replace with `const bounds = calculateBounds(selectedFeatures); if (bounds === null) return; this.fitBounds(boundsToLeaflet(bounds));` — preserve the existing early-return for `selectedIds.size === 0` that sits above this block (FR-008, FR-009, US4 AS-1 through AS-6, contract C10 + C11) `apps/vscode/src/webview/mapPanel.ts`
- [x] T017 [test] Manual smoke test per quickstart Step 7: open a plot containing a mix of geometry types; verify (a) Point+LineString-only selection zooms identically to pre-change; (b) Polygon selection zooms correctly where pre-change silently missed; (c) MultiPolygon selection zooms to the union; (d) empty selection leaves viewport unchanged (SC-008, contract C9 + C10 + C11) `specs/200-bounds-consolidation/evidence/selection-zoom-smoke.md`

**Parallel execution**: Nothing to parallelise — T016 is the only code change in this phase and T017 depends on it. Phase 6 depends on Phase 2 (the widened parameter and per-geometry-type tests must be in place before `DebriefFeature[]` can flow into `calculateBounds` with test-backed confidence) and Phase 3 (`boundsToLeaflet` is already in the imports thanks to T009).

## Phase 7: Polish & Cross-Cutting Concerns

**Goal**: Capture the evidence artifacts that prove the feature works, draft the shipped media, and open the PR that carries the change.

### Evidence Collection

- [x] T018 Run the full CI gate (`task verify`) and capture the vitest results + coverage using the test-summary template (`.specify/templates/evidence/test-summary-template.md`) with YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`) `specs/200-bounds-consolidation/evidence/test-summary.md`
- [x] T019 Create a usage demonstration showing a consumer of the consolidated utility (VS Code map panel) passing its feature array through without an `as`-cast; include the actual one-line call shape for both plot-open and fitToSelection callers, plus the expected output shape `specs/200-bounds-consolidation/evidence/usage-example.md`
- [x] T020 [P] Capture the before/after of `fitToSelection()` — the ~35-line inline loop on one side, the three-line utility-call replacement on the other — as a side-by-side code-diff evidence artifact `specs/200-bounds-consolidation/evidence/before-after-fittoselection.md`
- [x] T021 [P] Capture the `coerceCoordinates` source snippet together with its Article XV.5 comment, plus the grep outputs proving no `any` and no double-cast pattern exists in `shared/utils/src/bounds.ts` (already produced by T015; this step formalises it as evidence) `specs/200-bounds-consolidation/evidence/narrowing-gate-source.md`
- [x] T022 [P] Tabulate the per-geometry-type assertions added in T007: list each type (Point / LineString / Polygon / MultiPoint / MultiLineString / MultiPolygon) against the input fixture and the expected bounds tuple `specs/200-bounds-consolidation/evidence/geometry-type-matrix.md`

### Media Content

- [x] T023 Use the Content Specialist agent (`.claude/agents/media/content.md`) to draft the Shipped Post. Sections: What We Built, Lessons Learned (the review gate catching the adjacent silent-miss bug), What's Next (the four deferred backlog items captured in T002). Tone consistent with the already-drafted `media/planning-post.md` — honest about scope expansion, credit the review gate `specs/200-bounds-consolidation/media/shipped-post.md`
- [x] T024 [P] Use the Content Specialist agent to draft a 150–200-word LinkedIn shipped summary with a strong hook, a link placeholder to the published post, and three technical tags `specs/200-bounds-consolidation/media/linkedin-shipped.md`

### PR Creation

- [x] T025 Create PR and publish blog: run `/speckit.pr` — opens the feature PR in `debrief-future` carrying all five Phase-2 Foundation commits + the Phase-3 deletions + the Phase-6 rewrite + the captured evidence, and publishes `shipped-post.md` to `debrief.github.io` `specs/200-bounds-consolidation/tasks.md`

**Task T025 must run last.** It depends on every evidence and media task above being complete. The PR description should cite SC-001 through SC-009 from the spec and link each to the evidence artefact that verifies it.

**Parallel execution**: T020, T021, T022 are independent file-creation tasks and can run concurrently. T023 and T024 are media drafts; T024 can run in parallel with T023. T018 and T019 are prerequisites for T023 (the shipped post cites the test counts and usage example).

## Dependencies

### Phase-level dependencies

```text
Phase 1 (Setup) ──► Phase 2 (Foundation) ──► Phase 3 (US1: delete + flip)
                                         │
                                         ├──► Phase 4 (US2: plot-open smoke)
                                         ├──► Phase 5 (US3: typecheck + narrowing-gate review)
                                         └──► Phase 6 (US4: fitToSelection rewrite + smoke)
                                                                           │
                                                                           ▼
                                                            Phase 7 (Polish: evidence + media + PR)
```

- **Phase 2 depends on Phase 1 T001** (pre-flight grep must confirm the consumer set before the Foundation commits land).
- **Phase 3 depends on Phase 2 T003** (the widened signature must exist before `mapPanel.ts` can import and type-check against it) and on Phase 2 T006–T008 (tests must be green at the canonical location before the vscode copy is deleted — otherwise any coverage gap would land silently).
- **Phase 4 depends on Phase 3 T009** (the import flip must be in place for the smoke test to exercise the consolidated utility).
- **Phase 5 depends on Phase 2 T003 and Phase 3 T009** (both the widening and the flip must be landed; typecheck verifies their joint correctness).
- **Phase 6 depends on Phase 2 T003 (widened signature) and Phase 2 T007 (per-geometry-type tests must be green before the rewrite lands — they are the test coverage that makes the rewrite safe).** Phase 6 does **not** strictly depend on Phase 3's deletions — it could technically precede them — but the ordering chosen here lets Phase 3 land a clean atomic commit and keeps Phase 6 a focused behavioural change.
- **Phase 7 depends on Phase 6** (the PR cannot open until the rewrite is in place; evidence cannot be captured until the final state exists).

### User-story parallelism

Once Phase 2 is complete, **Phase 4 / Phase 5 / Phase 6 can each progress independently**. They touch disjoint verification surfaces (manual smoke, typecheck, code-review; manual smoke). Phase 3 touches `apps/vscode/src/webview/mapPanel.ts` and Phase 6 also touches it — Phase 3 only flips imports while Phase 6 only touches `fitToSelection()` body, so they do not conflict at the file level but should land in commit order Phase 3 → Phase 6 for reviewability.

### Task T002 independence

`T002` (backlog entries) is orthogonal to every other task. It can run at any time during the work — including concurrently with Phase 2 — and has no code dependencies.

## Implementation Strategy

### Commit cadence

Land one commit per task. The Phase 2 sequence in particular (T003 → T005 → T006) is designed so the commit graph tells the TDD story: a reviewer walking the history can see "widen parameter + introduce gate" → "failing test" → "guard fix that makes it pass". If T003's combined content is too large for a single commit, split it as `T003a` (widen parameter) and `T003b` (introduce narrowing gate) — but land them back-to-back, because the widening without the gate would briefly fail FR-007.

### MVP increment

The **minimum mergeable slice** is Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5 + Phase 7 (without Phase 6). That delivers US1 + US2 + US3 — the backlog-item-as-written. Phase 6 (US4) is the `/speckit.review`-triggered scope expansion and, while strongly recommended, could be carved out into its own follow-up PR if implementation finds Phase 6 is blocked.

We are **not** splitting Phase 6 out. The per-geometry-type tests (T007) already land in Phase 2 regardless, so the incremental cost of doing the rewrite here is small and the review-narrative win is real (one PR closes both the duplication and the silent miss). If blockers emerge, they are a reason to stop and reassess — not a default.

### Parallelisation opportunities

- **Phase 1 inner parallelism**: T002 is fully independent; start it at any time.
- **Phase 2 inner parallelism**: Once T003 has landed, T004, T007, and T008 are all parallel test-only edits to `shared/utils/tests/bounds.test.ts`. T005 and T006 must remain sequential (the TDD contract).
- **Phase 3 inner parallelism**: T010 and T011 are independent deletions; they can share a single commit or split across two.
- **Phases 4 / 5 / 6 cross-parallelism**: Post-Phase-3, these three phases are fully independent and could be progressed in parallel by three people or three sessions. We recommend serial execution for a single-implementer flow — the manual smoke tests benefit from attention, not parallelism.
- **Phase 7 inner parallelism**: T020, T021, T022, T024 are marked `[P]` and share no file. T023 waits on T018–T022 for the lessons-learned content to be grounded in the captured evidence.

### Risk budget

Per research R5, all identified risks are low and mitigations are folded into the task list. The highest-risk item is the structural-subtype assumption in R7 — that `DebriefFeature[]` flows into the widened parameter without a call-site cast. T014 verifies this at typecheck time; if it fails, fall back to the "shared structural base" alternative from R1 (research R1 option B) and re-plan Phase 2 accordingly. That fallback would expand Phase 2's scope, not the overall PR — but it is the one place where "something surprising happens at implementation time" is plausible.

### Post-merge follow-ups

The four deferred backlog entries created in T002 are not on this PR's critical path. Expect to pick them up as independent items in the subsequent sprint. The most valuable of the four (drift-prevention rule) is what keeps SC-001 durable; worth prioritising.
