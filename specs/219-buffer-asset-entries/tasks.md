---
description: "Task list for feature 219 — Buffer Scene-Thumbnail Asset Entries Until Save"
---

# Tasks: Buffer Scene-Thumbnail Asset Entries Until Save

**Input**: Design documents from `/specs/219-buffer-asset-entries/`
**Prerequisites**: plan.md, spec.md (User Stories 1–3, all P1), research.md, data-model.md, contracts/scene-thumbnail-buffer.md, quickstart.md

**Tests**: Tests are written first for every behaviour change (Constitution Article VII — Test-Driven AI Collaboration). The buffer service is new code and gets unit tests from day one (Article VI). Existing test files for `sceneThumbnailService`, `captureScene`, and the storyboard panel are migrated rather than weakened (FR-013); a new `saveSession.test.ts` is added because none exists today.

**Organization**: Three independent acceptance angles on a single architectural change. US1, US2, and US3 are all P1 — they fall out of the same code change but have distinct, independently verifiable acceptance criteria. The task ordering reflects dependency, not priority: the buffer service blocks everything; US1 (capture-side refactor) makes US2 (panel render proof) and US3 (save-side merge) testable.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the architectural fix. Because this feature has no UI surface, evidence emphasises the *invariant being restored* (`item.json` byte-identity across discard) and the *single-write metric* (per-save `item.json` rewrites drop from N to 1) rather than screenshots.

**Evidence Directory**: `specs/219-buffer-asset-entries/evidence/`
**Media Directory**: `specs/219-buffer-asset-entries/media/`

### Feature type → Integration / architectural refactor

Per the Quality Rubric in `.specify/templates/tasks-template.md`: this falls into the **Integration** band (end-to-end flow + sequence diagram), supplemented by **Schema Change**-style round-trip proof — except that the round-trip subject is `item.json` byte-identity across capture/discard/save cycles, not a LinkML schema.

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/opening-context.md` | Cached opener (3 prose sections) — already written during `/speckit.plan`. | (already captured) |
| `evidence/test-summary.md` | Vitest results for `sceneThumbnailBuffer`, `sceneThumbnailService` (migrated), `captureScene` (migrated), `saveSession` (new), `storyboardPanelView` (extended). YAML front matter with `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`. | After all tests pass |
| `evidence/usage-example.md` | Walkthrough of the three flows from `quickstart.md` §4 (capture-then-discard, capture-then-save, capture-then-undo-then-save) with the actual `jq` diff outputs. | After implementation works on a sample plot |
| `evidence/itemjson-discard-before-after.md` | Sample `item.json.assets` snippets: pre-session, post-three-captures (still pre-session), post-discard. Proves byte-identity for the headline acceptance scenario (US1). | After US1 implementation lands |
| `evidence/integration-flow.md` | End-to-end capture→buffer→save→commit sequence with a Mermaid diagram. References the touched files (sceneThumbnailService, sceneThumbnailBuffer, captureScene, saveSession, extension) and the lifecycle hooks (plot close, save failure retry). | After all stories implemented |
| `media/shipped-post.md` | Feature post combining cached opener + ship-time evidence. | Polish phase |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener (What We're Building, How It Fits, Key Decisions) | During /speckit.plan (already done) |
| `media/shipped-post.md` | Feature post — first three sections copied verbatim from cached opener; By the Numbers + Lessons Learned + What's Next written from `evidence/test-summary.md` and `evidence/integration-flow.md`. | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief/debrief-future` including all evidence and the migrated tests. | Final task in Polish phase (T029) |
| Blog PR | PR in `debrief.github.io` publishing `media/shipped-post.md`. | Triggered by `/speckit.pr` |

> **Why no screenshots / GIFs**: This is a backend / architectural-boundary change. The user-visible payoff (discard leaves `item.json` untouched) is best demonstrated as a `jq` diff, not a screenshot. The Storyboard panel render path is unchanged — capturing screenshots would not differentiate before/after states and would dilute the actual evidence (the byte-identity proof). Per the Quality Rubric, "Integration" features ship with a sequence diagram, not screenshots.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Sanity-check the workspace state. This feature introduces zero new runtime dependencies and zero new tooling — the change is a refactor inside `apps/vscode/src/`.

- [ ] T001 Confirm working tree is on the feature branch and `.specify/.active-feature` resolves to `219-buffer-asset-entries`. Run `git status` and `cat .specify/.active-feature`. No file changes; gate task only.
- [ ] T002 Confirm no new runtime dependencies are required by reviewing `plan.md` Technical Context against `apps/vscode/package.json`. No file changes; documentation gate.

**Checkpoint**: Workspace ready. No project scaffolding needed — proceed to Foundation.

## Phase 2: Foundation — `SceneThumbnailBuffer` service (Blocking Prerequisites)

**Purpose**: Build the new in-memory buffer that all three user stories depend on. Pure module — no filesystem, no VS Code API. Contract per `contracts/scene-thumbnail-buffer.md` §1.

**⚠️ CRITICAL**: User-story phases (3, 4, 5) cannot begin until the buffer service exists and its tests are green. Foundation work is sequential: tests → implementation → green-bar verification.

### Tests for Foundation

> **NOTE: Write tests FIRST. They MUST fail (or fail to compile) before T004 lands the implementation.** Per Constitution Article VII: tests define "done."

- [ ] T003 [test] Write unit tests for `SceneThumbnailBuffer` covering the full contract surface — `enqueue` (idempotency on key, insertion-order preservation), `pending` (snapshot, never undefined), `peekLive` (filter against a `LivePredicate`, drops non-live entries from the buffer as a side-effect), `commit` (drops listed keys, forgiving of missing keys), `clear` (per-plot, no cross-plot leak), `clearAll`. Include explicit per-plot isolation tests (operations on plot A do not affect plot B's buffer) `apps/vscode/tests/unit/sceneThumbnailBuffer.test.ts`

### Implementation for Foundation

- [ ] T004 Implement `SceneThumbnailBuffer` per contract — concrete `class SceneThumbnailBuffer` with private `Map<string, Map<string, PendingAssetEntry>>` state. Public methods: `enqueue`, `pending`, `peekLive`, `commit`, `clear`, `clearAll`. Zero filesystem imports. All types concrete (no `any`). Export the `PendingAssetEntry` interface and `LivePredicate` type alias `apps/vscode/src/services/sceneThumbnailBuffer.ts`
- [ ] T005 Run buffer test suite and confirm green: `pnpm --filter @debrief/vscode test sceneThumbnailBuffer`

**Checkpoint**: Buffer service is testable in isolation and fully green. User stories can now begin.

### Parallel Opportunities (Phase 2)

None within this phase — T003 (tests) must precede T004 (implementation), which must precede T005 (verification).

## Phase 3: User Story 1 — Discarding unsaved scene captures leaves the persisted plot untouched (Priority: P1)

**Goal**: Capturing N Scenes and then discarding the session leaves `item.json` byte-identical to its pre-session state. PNGs may exist on disk (orphans, GC'd by the existing `gcOrphanAssets` pass), but the on-disk plot descriptor is unchanged.

**Independent Test**: From `quickstart.md` §4 steps 1–8 — `jq -S '.assets | keys' item.json` produces identical output before opening the plot and after discarding three captured Scenes. Buffer is cleared on plot close.

### Tests for User Story 1

> **NOTE: Write these tests FIRST. They MUST fail before T009/T010/T011 land.** Tests assert the new contract: capture writes PNGs only; `item.json` is untouched until save; the buffer is cleared on plot close.

- [ ] T006 [P][test][US1] Migrate `sceneThumbnailService.test.ts` — replace assertions of the form "after `writeSceneThumbnail`, `item.json.assets` contains `scene-thumbnail-{id}` and `scene-thumbnail-{id}-sm` keys" with the new contract: (a) PNGs written atomically to `{stacItemPath}/scene-thumbnails/scene-{id}.png` and `-sm.png`, (b) `item.json` byte-identical to its pre-call state, (c) returned `WriteSceneThumbnailResult.pendingEntries` contains exactly two entries with the correct keys / hrefs / type / title / roles. Drop tests for `item-json-unreadable` and `item-json-malformed` errors raised from `writeSceneThumbnail` (those reasons remain valid for `deleteSceneThumbnail` and `gcOrphanAssets`) `apps/vscode/tests/unit/sceneThumbnailService.test.ts`
- [ ] T007 [P][test][US1] Migrate `captureScene.test.ts` — extend `CaptureCommandDeps` test fixture to inject a fake `SceneThumbnailBuffer` (a small spy implementing `enqueue`); assert that a successful capture (i) writes the two PNGs, (ii) calls `buffer.enqueue(stacItemPath, [largeEntry, smallEntry])` exactly once, (iii) leaves `item.json` byte-identical, (iv) records the `LogService` activity unchanged from today. Update existing failure-path tests (thumbnail capture failed, mapPanel returns empty PNG) to assert `buffer.enqueue` was NOT called `apps/vscode/tests/unit/captureScene.test.ts`
- [ ] T008 [test][US1] Add a plot-close test asserting that the buffer's `clear(stacItemPath)` is called when the active plot is closed without saving. Test target depends on where the plot-close hook lives — most likely a small dedicated test inside the new `apps/vscode/tests/unit/sceneThumbnailBuffer.test.ts` (a unit test exercising the `clear` API plus a wiring assertion that the extension activates a plot-close handler that calls it). If existing test infrastructure prefers a different location, prefer extending `storyboardEditService.test.ts` where the existing `gcOrphanAssets` plot-close call is already covered `apps/vscode/tests/unit/sceneThumbnailBuffer.test.ts`

### Implementation for User Story 1

- [ ] T009 [US1] Refactor `writeSceneThumbnail` in `apps/vscode/src/services/sceneThumbnailService.ts` per contract §2: drop the internal `readItemJson` + assets-merge + atomic rewrite of `itemJsonPath`; the function MUST NOT touch `item.json`. Keep the existing PNG write atomicity (tmp + fsync + rename via `writeAtomic`). Extend `WriteSceneThumbnailResult` with `pendingEntries: readonly [PendingAssetEntry, PendingAssetEntry]`. Remove the now-unused `validateStacItemPath` call's reliance on `item.json` existence (still validate that the directory exists, but not that `item.json` is readable — capture should not fail on a malformed item.json that the save path will re-read anyway). Preserve `deleteSceneThumbnail` and `gcOrphanAssets` unchanged `apps/vscode/src/services/sceneThumbnailService.ts`
- [ ] T010 [US1] Update `apps/vscode/src/commands/captureScene.ts`: add `buffer: SceneThumbnailBuffer` to `CaptureCommandDeps` (alongside the existing `writeSceneThumbnail` injection point); after `await deps.writeSceneThumbnail(...)` returns successfully, call `deps.buffer.enqueue(stacItemPath, result.pendingEntries)` BEFORE the call to `createScene`. Failure modes: if `writeSceneThumbnail` throws, `enqueue` is never called (the existing rejected-with-thumbnail-failed path is preserved unchanged) `apps/vscode/src/commands/captureScene.ts`
- [ ] T011 [US1] Wire the buffer in `apps/vscode/src/extension.ts`: instantiate a singleton `SceneThumbnailBuffer` at activation; pass it into the `setThumbnailService.captureThumbnail` port implementation (around line 269) — the port impl calls `writeSceneThumbnail` then `buffer.enqueue` and returns `{ assetKey }`; pass the same singleton through to `createSaveSessionCommand` (extension.ts call-site for the save command); add `buffer.clear(stacItemPath)` to the existing plot-close hook alongside `sceneThumbnailGcOrphanAssets`. Use `path.join(store.path, plot.itemPath)` to derive `stacItemPath` consistently with the existing wiring `apps/vscode/src/extension.ts`
- [ ] T012 [US1] Run US1 test bundle and confirm green: `pnpm --filter @debrief/vscode test sceneThumbnailService captureScene sceneThumbnailBuffer`

**Checkpoint**: US1 acceptance scenario 1 (capture-then-discard leaves item.json byte-identical) is provable via the migrated `sceneThumbnailService.test.ts` and `captureScene.test.ts` plus the plot-close test. The user-visible behaviour change is now testable independently of US2 and US3.

### Parallel Opportunities (Phase 3)

- T006 and T007 touch different test files and can run in parallel.
- T009, T010, T011 have a strict ordering: T009 (the service refactor) defines the new return type; T010 (the capture command) consumes it; T011 (the extension wiring) wires both T009 and T010 into the runtime. Sequential.

## Phase 4: User Story 2 — Storyboard panel and existing surfaces continue to render thumbnails for unsaved Scenes (Priority: P1)

**Goal**: While the buffer is non-empty (captures pending, session unsaved), the Storyboard panel and any other thumbnail consumer continue to render Scene thumbnails. Zero functional or visual difference from saved Scenes.

**Independent Test**: Capture a Scene; without saving, observe the Scene's thumbnail in the Storyboard panel. The render path resolves the PNG by file convention (`{stacItemPath}/scene-thumbnails/scene-{id}.png`) — no item.json lookup — so eager PNG writes are sufficient. A unit test confirms `resolveThumbnailHref` works against an unsaved buffered Scene.

### Tests for User Story 2

- [ ] T013 [test][US2] Extend `storyboardPanelView.test.ts` with a test asserting that `resolveThumbnailHref` produces a non-empty `webview.asWebviewUri(...)`-style file URI for a Scene whose buffered entries are pending — i.e. no `scene-thumbnail-*` keys exist in `item.json.assets`, but the PNG is on disk at the expected convention path. The test proves the panel never depended on `item.json.assets` for rendering and therefore satisfies FR-004 transitively from the eager-PNG decision in US1 `apps/vscode/tests/unit/storyboardPanelView.test.ts`

### Implementation for User Story 2

> **No code change required.** US2's behaviour is delivered by the design choice in research.md R-5 (PNGs stay eager) plus US1's implementation. This phase is verification-only.

- [ ] T014 [US2] Run storyboard-panel test bundle and confirm green: `pnpm --filter @debrief/vscode test storyboardPanelView storyboardEditService`. The new test from T013 plus all existing storyboard-panel and storyboard-edit tests MUST pass without code changes outside `apps/vscode/tests/unit/`.

**Checkpoint**: US2 acceptance scenarios are provable. Render parity between buffered and saved Scenes is verified.

### Parallel Opportunities (Phase 4)

None — single test, single verification step.

## Phase 5: User Story 3 — Save reconciles all buffered asset changes in a single atomic write (Priority: P1)

**Goal**: On save, every buffered asset entry whose Scene still exists in the in-memory plot is committed into `item.json` in a single atomic rewrite. On success the buffer drains; on failure the buffer is preserved for retry. Filter-on-flush silently drops entries for Scenes that were undone or deleted before save.

**Independent Test**: From `quickstart.md` §4 steps 9–12 — capture two Scenes, save: `item.json.assets` gains exactly four new keys (large + small per Scene). Inject a write failure: buffer survives, retry succeeds. Capture-then-undo-then-save: no new asset keys appear.

### Tests for User Story 3

> **NOTE: Write tests FIRST. They MUST fail before T017/T018/T019 land.** A new `saveSession.test.ts` is created — no existing file to migrate.

- [ ] T015 [P][test][US3] Create `apps/vscode/tests/unit/saveSession.test.ts` with happy-path coverage: (a) capture two Scenes (enqueue four entries — large + small per Scene), then save; assert exactly one `item.json` rewrite happens during save and `item.json.assets` contains the original keys plus four new `scene-thumbnail-*` keys; (b) on save success, `buffer.commit(stacItemPath, committedKeys)` is called with all four keys; (c) `buffer.pending(stacItemPath)` is `[]` after save success `apps/vscode/tests/unit/saveSession.test.ts`
- [ ] T016 [P][test][US3] Extend `saveSession.test.ts` with failure-mode coverage: (a) inject an `fs.writeFileSync` failure on the `item.json` rewrite; assert the save command surfaces the error to the user, `buffer.commit(...)` is NOT called, and `buffer.pending(stacItemPath)` still contains all four entries; (b) on a subsequent successful retry, all four entries are committed and the buffer drains; (c) filter-on-flush — capture-then-undo (the in-memory plot's Scene has no `thumbnail_asset_ref` matching the buffered key) followed by save: `peekLive` drops the entry, `item.json.assets` gains nothing for that Scene, and `buffer.pending(stacItemPath)` is `[]` (the non-live entry is dropped from the buffer as a side-effect of `peekLive` per contract §3 Final API note) `apps/vscode/tests/unit/saveSession.test.ts`

### Implementation for User Story 3

- [ ] T017 [US3] Extend `storeThumbnails` in `apps/vscode/src/commands/saveSession.ts` per contract §3: add a fifth parameter `pendingSceneEntries: readonly PendingAssetEntry[]`; merge each entry into `itemData.assets` alongside the plot-level `thumbnail` / `thumbnail-sm` keys (existing entries preserved). Single `fs.writeFileSync(itemJsonPath, JSON.stringify(itemData, null, 2))` call — preserve the all-or-nothing guarantee `apps/vscode/src/commands/saveSession.ts`
- [ ] T018 [US3] Extend `createSaveSessionCommand` factory in `apps/vscode/src/commands/saveSession.ts` to accept `buffer: SceneThumbnailBuffer`. In the save handler, after step 5 (plot thumbnail capture), before step 7 (`storeThumbnails` call): build a `LivePredicate` over the active in-memory features (use `MapPanel.getCurrentFeatures()` and the same closed-form predicate as `gcOrphanAssets`: `assetKey === f.properties.thumbnail_asset_ref || assetKey === f.properties.thumbnail_asset_ref + '-sm'`), call `buffer.peekLive(stacItemPath, livePredicate)`, pass the result into `storeThumbnails`. After `storeThumbnails` returns successfully, call `buffer.commit(stacItemPath, peekedEntries.map(e => e.key))`. On `storeThumbnails` failure, the existing error-message path runs and the buffer is left intact (FR-007) `apps/vscode/src/commands/saveSession.ts`
- [ ] T019 [US3] Update the call-site in `apps/vscode/src/extension.ts` for `createSaveSessionCommand` to pass the buffer singleton (already wired in T011). Verify the order: buffer is constructed before either the capture port impl or the save command factory is invoked `apps/vscode/src/extension.ts`
- [ ] T020 [US3] Run US3 test bundle and confirm green: `pnpm --filter @debrief/vscode test saveSession sceneThumbnailBuffer`

**Checkpoint**: All three user stories are independently provable. The headline metric (per-save `item.json` rewrites = 1) is verified by T015. Save-failure recovery is verified by T016. Filter-on-flush undo handling is verified by T016.

### Parallel Opportunities (Phase 5)

- T015 and T016 both write to the new `saveSession.test.ts` file — but each is a distinct `describe` block. They can be authored in parallel ([P]) by two collaborators or two passes, but committed in a single edit cycle to avoid file conflicts.
- T017 and T018 both modify `apps/vscode/src/commands/saveSession.ts` and MUST be sequential (T017 defines the helper signature T018 calls).
- T019 (`extension.ts`) is sequential after T018.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Run the full quality gate, walk the manual end-to-end, capture the evidence artifacts the architecture rubric demands, and ship.

### Cross-cutting verification

- [ ] T021 Run the full extension test suite and confirm no regression in any neighbouring module: `pnpm --filter @debrief/vscode test`
- [ ] T022 Run the project-wide CI gate (matches what CI runs): `task verify` (or, if `task` is unavailable, run the four-step fallback documented in `CLAUDE.md` §"Before Pushing")
- [ ] T023 Walk through `quickstart.md` §4 manually against a sample plot from `preview/workspace/samples/local-store/` — record the three `jq` diff outcomes (capture-then-discard empty diff, capture-then-save four new keys, capture-then-undo-then-save empty diff). Attach the raw outputs into the evidence file in T026.

### Evidence Collection

- [ ] T024 Capture test results using the template `.specify/templates/evidence/test-summary-template.md` `specs/219-buffer-asset-entries/evidence/test-summary.md`. YAML front matter MUST include `feature: 219-buffer-asset-entries`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`. Body MUST list the suites covered (`sceneThumbnailBuffer`, `sceneThumbnailService`, `captureScene`, `saveSession`, `storyboardPanelView`, plus the unaltered storyboard-edit suite) with one-line key-scenarios-verified per suite (e.g. "save preserves buffer on failure", "capture leaves item.json byte-identical").
- [ ] T025 Create usage demonstration `specs/219-buffer-asset-entries/evidence/usage-example.md`. Walk through the three flows from `quickstart.md` §4 with the concrete `jq` diff outputs and a short narrative for each. This is the user-readable counterpart to the test-summary's metric.
- [ ] T026 [P] Capture before/after `item.json.assets` snippets `specs/219-buffer-asset-entries/evidence/itemjson-discard-before-after.md`. Three snippets: pre-session (baseline), post-three-captures-pre-discard (still byte-identical to baseline — the headline proof), post-discard (identical to baseline). Use a real sample plot and paste the actual JSON.
- [ ] T027 [P] Capture the integration flow `specs/219-buffer-asset-entries/evidence/integration-flow.md`. Include a Mermaid `sequenceDiagram` covering: capture → writeSceneThumbnail (PNG only) → buffer.enqueue; save → buffer.peekLive → storeThumbnails (single item.json rewrite) → buffer.commit; plot close → buffer.clear → gcOrphanAssets. Reference the touched files (`sceneThumbnailService.ts`, `sceneThumbnailBuffer.ts`, `captureScene.ts`, `saveSession.ts`, `extension.ts`) with line ranges where relevant.

### Media Content

- [ ] T028 Create feature blog post `specs/219-buffer-asset-entries/media/shipped-post.md`. The Content Specialist (`.claude/agents/media/content.md`) writes this. The first three sections (`## What We're Building`, `## How It Fits`, `## Key Decisions`) MUST be copied verbatim from `specs/219-buffer-asset-entries/evidence/opening-context.md` (cached during `/speckit.plan`). Subsequent sections (`## Screenshots`, `## By the Numbers`, `## Lessons Learned`, `## What's Next`) are written from the evidence captured in T024–T027. Note: the `## Screenshots` section may be omitted or re-purposed for this feature — consider an `item.json` diff or a Mermaid sequence excerpt instead, per the rubric override declared in the Evidence Requirements above. Track: `[credibility]` with optional `momentum` flavour.

### PR Creation

- [ ] T029 Create PR and publish blog: run `/speckit.pr`. This task creates the feature PR in `debrief/debrief-future` (with all evidence attached and the migrated tests committed) AND publishes `media/shipped-post.md` to `debrief.github.io`. **Dependencies**: ALL prior tasks (T001–T028) MUST be complete.

**Checkpoint**: Feature shipped. PR open, blog post live, evidence archived.

### Parallel Opportunities (Phase 6)

- T026 and T027 are independent files and can be authored in parallel ([P]).
- T024 and T025 must follow T021–T023 (evidence captures the test-suite output and the manual walkthrough), so they are sequential after the verification block.
- T028 (blog post) depends on T024 and T025 (numbers + walkthrough feed the post body) but can begin once those are done.
- T029 (PR) is strictly the last task — no parallelism.

## Dependencies

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — sanity-checks only.
- **Phase 2 (Foundation)**: Depends on Phase 1 (workspace ready). **Blocks every user-story phase.**
- **Phase 3 (US1)**: Depends on Phase 2 (buffer service exists and is green).
- **Phase 4 (US2)**: Depends on Phase 3 (the eager-PNG-write decision lands in T009; T013 then verifies the panel renders against buffered-only state).
- **Phase 5 (US3)**: Depends on Phase 3 (T010/T011 wire the buffer into the capture path; T018/T019 are the save-side counterpart). Could overlap Phase 4 if staffed in parallel — same code change set, but tests live in a different file.
- **Phase 6 (Polish)**: Depends on Phase 3, 4, and 5 all green.

### Cross-phase critical path

```text
T001 → T002 → T003 → T004 → T005           (Foundation green)
                              ↓
                   T006/T007/T008  →  T009 → T010 → T011 → T012  (US1 green)
                                                              ↓
                                                ┌─────────────┴─────────────┐
                                                ↓                           ↓
                                         T013 → T014                 T015/T016 → T017 → T018 → T019 → T020
                                          (US2)                               (US3)
                                                ↓                           ↓
                                                └────────────┬──────────────┘
                                                             ↓
                                                T021 → T022 → T023        (verification)
                                                             ↓
                                            T024 → T025 → T026/T027       (evidence)
                                                             ↓
                                                          T028             (blog post)
                                                             ↓
                                                          T029             (PR)
```

### Within-task dependencies of note

- **T009 → T010**: The capture command (T010) depends on the new `WriteSceneThumbnailResult.pendingEntries` shape introduced in T009.
- **T011 ↔ T019**: Both edit `extension.ts`. Sequence them: T011 first (instantiates the buffer singleton and adds the plot-close hook), T019 second (passes the singleton through to `createSaveSessionCommand`). Or fold both into a single edit cycle if implemented in one PR pass.
- **T015/T016 → T017/T018**: Tests-first per Constitution Article VII. Tests for the save-side merge are written before the implementation that makes them pass.
- **T024 ← T021/T022**: The test-summary YAML front matter requires real pass/fail counts and coverage % from the suite runs.
- **T028 ← T024/T025/T026/T027**: The "By the Numbers" and "Lessons Learned" sections of the blog post draw from these evidence files.

## Implementation Strategy

### Incremental delivery

Although all three user stories are P1, they don't ship as separate increments — they're three angles on the same architectural change. Practical delivery order:

1. **Foundation green** (T001–T005): Buffer service exists and passes its own tests in isolation. No production wiring yet.
2. **US1 lands first** (T006–T012): The capture-side refactor is the core change. Migrating the existing `sceneThumbnailService` and `captureScene` test files is what makes the rest of the change safe — the tests assert the new contract verbatim. After T012 the unsaved-state behaviour is correct; saves still rely on the next phase.
3. **US2 verifies passively** (T013–T014): No new code. The single test in T013 confirms the panel render path was always file-path-based, which is why eager PNG writes are sufficient.
4. **US3 closes the loop** (T015–T020): The save side merges the buffer. After T020 the round-trip (capture → discard, capture → save, capture → undo → save) is provable from end to end.
5. **Polish** (T021–T029): Full quality gate, evidence, blog post, PR.

### Parallel team strategy

This change is small and tightly coupled — best done by one person in one PR. If staffed by two:

- Developer A: Foundation (T002–T005), then US1 implementation (T009–T012).
- Developer B: writes US1 tests (T006–T008) ahead of A's implementation, then US3 tests (T015–T016) ahead of A's US3 implementation. Picks up US2 verification (T013–T014).

Both converge in Phase 6.

### Test-first ordering (Constitution Article VII)

Every user-story phase writes tests before implementation. Specifically:

- T003 (Foundation tests) → T004 (Foundation impl)
- T006/T007/T008 (US1 tests) → T009/T010/T011 (US1 impl)
- T015/T016 (US3 tests) → T017/T018/T019 (US3 impl)

This is the cadence Constitution Article VII mandates: tests define done.

### Risk mitigation

- **Risk**: Existing `sceneThumbnailService.test.ts` covers many edge cases (malformed item.json, missing dirs, ULID validation). Migration could weaken coverage.
  - **Mitigation**: The migration in T006 explicitly preserves error-path tests where they remain valid (PNG write failures, invalid-scene-id, missing stac-item dir) and DROPS only those that the new contract makes irrelevant (`item-json-unreadable` / `item-json-malformed` from `writeSceneThumbnail`'s call path — those reasons remain valid for `deleteSceneThumbnail` and `gcOrphanAssets`).
- **Risk**: The save command's new dependency on `MapPanel.getCurrentFeatures()` could fail under timing edge cases (mapPanel not yet ready, or returning a stale snapshot).
  - **Mitigation**: T018 uses the same `MapPanel.getCurrentFeatures()` call the existing storyboard-edit and capture flows already trust. No new failure surface introduced.
- **Risk**: Multi-plot save flows could leak buffer entries across plots.
  - **Mitigation**: T003 explicitly tests per-plot isolation; T015 captures-on-plot-A-don't-flush-with-plot-B is implicit in the `stacItemPath` keying — call this out as an explicit case in T015.
- **Risk**: A captured-but-not-saved Scene survives a crash as an orphan PNG that the GC pass should reclaim, but the GC pass is keyed to `item.json.assets` membership — so a PNG never registered in `item.json` would never be GC'd.
  - **Mitigation**: Read the existing `gcOrphanAssets` body in `sceneThumbnailService.ts:361-417` carefully. It iterates `item.json.assets` and reclaims entries with no matching live Scene. PNGs that were *never registered* in `item.json` are NOT reclaimed by the current implementation. **This is a real concern.** Add an addendum task: T027 (integration-flow.md) MUST call out that orphan-PNG-from-discarded-capture reclaim is a known gap, and that a follow-up backlog item should extend `gcOrphanAssets` to also walk the `scene-thumbnails/` directory and reclaim files whose key is not present in `item.json.assets`. See "Notes & Follow-ups" below.

### Notes & Follow-ups

- The orphan-PNG-from-discard reclaim gap noted above is **not a regression** — today's behaviour is the opposite (discarded captures leave stale `item.json` entries pointing at PNGs that DO get GC'd). This change tightens the in-memory boundary at the cost of leaving orphan files on disk for discarded sessions. Net: cleanlier `item.json`, slightly more orphan PNGs. The mitigation is a small follow-up to `gcOrphanAssets` to scan the directory side as well as the asset-map side. Capture this as a backlog item after T027.
- Per Constitution Article XIV (pre-release freedom), no deprecation period is required for the contract change to `writeSceneThumbnail`'s return shape.
- Per Constitution Article XV (strict type safety), every new type (`PendingAssetEntry`, `LivePredicate`, the extended `WriteSceneThumbnailResult`) is concrete with no `any`.
