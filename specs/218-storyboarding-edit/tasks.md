# Tasks: Storyboarding — Edit Suite + Housekeeping

**Feature**: 218-storyboarding-edit
**Branch**: `218-storyboarding-edit`
**Model**: Opus (High complexity per BACKLOG.md)
**Input**: `specs/218-storyboarding-edit/{spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md}`

---

## Evidence Requirements

**Purpose**: Capture artifacts demonstrating the edit suite works end-to-end. Feeds the PR description + shipped blog post.

**Evidence Directory**: `specs/218-storyboarding-edit/evidence/`
**Media Directory**: `specs/218-storyboarding-edit/media/`

**Feature type**: **VS Code Extension Workflow** — evidence captured by Playwright driving the **web-shell** (`apps/web-shell/playwright/tests/storyboard-edit.spec.ts`) per CLAUDE.md web-shell-first guidance and `docs/e2e-testing-guide.md` §3.

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip E2E tasks. The project uses `@sparticuz/chromium` (bundled Linux binary). Run `node apps/web-shell/run-playwright.mjs`. Details: `docs/project_notes/playwright-installation-research.md`.

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | pytest + vitest + Playwright tallies with YAML front-matter (`git_sha`, `captured_at`, `tests_passed/failed/skipped`, `coverage_pct`) | Polish phase, after all tests green |
| `evidence/usage-example.md` | End-to-end polish-loop walkthrough (rename → describe → delete+undo → update-to-current → duplicate → copy-to-other → refresh stale) with expected LogPanel cards | Polish phase |
| `evidence/screenshots/rename-and-describe.png` | Web-shell screenshot: inline-rename + expanded edit form with markdown preview | After Story 1 tests pass |
| `evidence/screenshots/delete-with-undo.png` | Web-shell screenshot: undo toast visible after soft-delete | After Story 1 tests pass |
| `evidence/screenshots/update-to-current.png` | Web-shell screenshot: refreshed thumbnail after update-to-current | After Story 1 tests pass |
| `evidence/screenshots/copy-to-other.png` | Web-shell screenshot: destination Storyboard + two linked LogPanel cards (copy-out/copy-in) | After Story 1 tests pass |
| `evidence/screenshots/refresh-stale.png` | Web-shell screenshot: StaleBadge + post-refresh clean row | After Story 2 tests pass |
| `evidence/screenshots/missing-data-routing.png` | Web-shell screenshot: edit form landed from #217 hard-block with missing-data panel populated | After Story 1 tests pass |
| `evidence/screenshots/bulk-refresh-all-stale.png` | Web-shell screenshot: rollup LogPanel card + Storyboard with all stale badges cleared | After Story 2 tests pass |
| `evidence/screenshots/log-panel-collapsed.png` | Web-shell screenshot: collapsed same-op card in LogPanel (FR-EDIT-026) | After Polish collapse test |
| `evidence/screenshots/duplicate-timestamp-collision.png` | Web-shell screenshot: Replace / Offset (+1 s) / Cancel modal during `duplicate` at a colliding timestamp — proves no-silent-overwrite (SC-007) | After Story 1 tests pass |
| `evidence/screenshots/deep-copy-failure.png` | Web-shell screenshot: red toast *"Could not copy thumbnail. Scene not copied."* after an induced `ThumbnailDeepCopyFailedError` — atomicity-under-failure story (SC-002) | After Story 1 tests pass |
| `evidence/screenshots/storyboard-cascade-delete.png` | Web-shell screenshot: Storyboard overflow → Delete confirmation modal naming the cascaded Scene count | After Story 1 tests pass |
| `evidence/screenshots/vscode-native-chrome.png` | Code-server screenshot of a real VS Code input box + quick pick during rename / copy-to-other — proves the VS Code chrome path works end-to-end (not just the web-shell) | After Polish code-server E2E |
| `evidence/screenshots/interaction.gif` | < 5s, < 2MB interaction GIF: polish loop (rename → describe → delete+undo → refresh-stale) | Web-shell Playwright via `recordVideo` + GIF conversion |
| `evidence/webview-e2e-summary.md` | Summary of code-server webview E2E run — covers VS Code native input-box / quick-pick / toasts | Polish phase |
| `evidence/perf-budget-report.md` | CI output of stale-pass perf test (SC-014 — 50 ms at spec bound) | Polish phase |
| `evidence/round-trip-logentry.md` | LinkML round-trip proof for the new LogEntry sentinel (Article II.2, test 10E) | Polish phase |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/planning-post.md` | Jekyll planning post | ✅ Already created via /speckit.plan |
| `media/linkedin-planning.md` | LinkedIn planning summary | ✅ Already created via /speckit.plan |
| `media/shipped-post.md` | Jekyll shipped post (What We Built, screenshots, Lessons Learned, What's Next) | Polish phase (Content Specialist) |
| `media/linkedin-shipped.md` | 150–200 word LinkedIn shipped summary | Polish phase (Content Specialist) |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief-future` with evidence + shipped-post link | Final task via `/speckit.pr` |
| Blog PR | PR in `debrief.github.io` with published shipped post | Triggered by `/speckit.pr` |

---

## Phase 1: Setup

**Goal**: Establish empty file scaffolding + package.json contributions + strings module. Zero behaviour change; every file here is either a placeholder with exports or a manifest entry. Done when typecheck + lint pass across the monorepo.

- [ ] T001 Create `StoryboardEditService` skeleton file with public API shape + `Disposable` activate stub `apps/vscode/src/services/storyboardEdit.ts`
- [ ] T002 [P] Create edit-command handler skeleton file with nine exported no-op handlers + `registerStoryboardEditCommands(context)` `apps/vscode/src/commands/storyboardEdit.ts`
- [ ] T003 [P] Create messages registry for user-visible strings (`storyboardEdit.*` keyed errors + toasts per `contracts/vscode-commands.md` §Error-toast message registry) `apps/vscode/src/messages/storyboardEdit.ts`
- [ ] T004 [P] Add ten command contributions + `refreshAllStaleThumbnails` menu entry + setting contribution `debrief.logPanel.collapseConsecutiveSameOp` (default `true`, `boolean`) to the VS Code manifest `apps/vscode/package.json`
- [ ] T005 [P] Create `SceneEditForm` presentational skeleton (prop-typed stub that returns an empty `<form role="form">`) per `contracts/scene-edit-form.md` `shared/components/src/panels/StoryboardPanel/SceneEditForm.tsx`
- [ ] T006 [P] Create `UndoToast` presentational skeleton (prop-typed stub returning `null` for now) `shared/components/src/panels/StoryboardPanel/UndoToast.tsx`
- [ ] T007 [P] Create `StaleBadge` presentational skeleton (prop-typed stub returning `null` for now) `shared/components/src/panels/StoryboardPanel/StaleBadge.tsx`
- [ ] T008 [P] Re-export the three new sub-components through the panel's `index.ts` (and the package root `shared/components/src/index.ts` so web-shell + VS Code can consume them) `shared/components/src/panels/StoryboardPanel/index.ts`
- [ ] T009 Wire `StoryboardEditService.activate()` into the extension entrypoint (instantiation + disposal registration + `setLogService` binding, mirroring #216 / #217 patterns) `apps/vscode/src/extension.ts`
- [ ] T010 Replace #217's `storyboardEditStub.ts` registration of `debrief.storyboard.editScene` with a delegation to `StoryboardEditService.openSceneForMissingDataEdit` and delete the stub file `apps/vscode/src/commands/storyboardEditStub.ts`
- [ ] T011 Verify pre-existing tests still compile with the skeleton additions (typecheck gate) `task verify:typecheck`
- [ ] T012 Extend ESLint `no-restricted-imports` (configured by #217) to forbid direct imports of Storyboard/Scene Feature types from anywhere outside `apps/vscode/src/services/storyboardEdit.ts` and the `@debrief/components/storyboard` crud module files; asserts SC-009 at lint time (analyze patch C1) `apps/vscode/eslint.config.js`

**Parallel opportunities**: T002–T008 all run in parallel after T001 lands the service type surface.

## Phase 2: Foundation (blocks every user story)

**Goal**: Land the shared primitives every user story depends on — #215 additive extensions (`restoreScene`, `checkSceneTimestamp`, `StoryboardOp` re-export), #174 additive extension (`gcOrphanAssets`), the `LogService.recordStoryboardEdit` recorder, the panel postMessage type extensions, and the discriminated-union view-model types. **No story-level flows run end-to-end yet**; done when every primitive has a passing unit test.

### #215 additive extensions (review 2A fold-in)

- [ ] T013 Add `restoreScene(plot, RestoreSceneInput): Promise<{ plot; scene }>` — strict superset of `createScene` that accepts `preservedProvenance`; appends a `restore` LogEntry on top of the preserved tail; only function permitted to write non-empty pre-built provenance (per `contracts/edit-service.md` §#215 module extensions) `shared/components/src/storyboard/crud.ts`
- [ ] T014 Add `checkSceneTimestamp(plot, storyboardId, timestamp, excludingSceneId): SceneFeature | null` — thin exported wrapper around the internal `findConflictingSceneTimestamp` `shared/components/src/storyboard/crud.ts`
- [ ] T015 Export the internal storyboard op union as `StoryboardOp` so #218 can `extend` rather than `duplicate` it (review 6A) `shared/components/src/storyboard/index.ts`
- [ ] T016 Add `describeStoryboard(plot, DescribeStoryboardInput): Promise<{ plot; storyboard }>` — mirrors `renameStoryboard` shape; appends a `storyboard.describe` LogEntry via `buildStoryboardCrudLogEntry`; preserves FR-EDIT-022 / SC-009 (no direct Feature write from #218 code) per analyze patch I1 `shared/components/src/storyboard/crud.ts`
- [ ] T017 [test] Unit tests for `restoreScene`: empty preservedProvenance behaves identically to `createScene`; non-empty preservedProvenance produces `provenance === [...preserved, restoreEntry]` byte-identically; `idOverride` honoured; throws `OrphanSceneError` when target Storyboard is gone `shared/components/src/storyboard/__tests__/crud.test.ts`
- [ ] T018 [P][test] Unit tests for `checkSceneTimestamp`: returns `null` when no conflict; returns the conflicting Scene when timestamp collides; respects `excludingSceneId` (doesn't flag self); works across Storyboards independently `shared/components/src/storyboard/__tests__/crud.test.ts`

### #174 additive extension (FR-EDIT-024)

- [ ] T019 Add `gcOrphanAssets(plot): Promise<{ reclaimed: readonly string[] }>` — scans `item.json` asset entries against live Scene `thumbnail_asset_ref` values; unlinks orphan PNGs; returns reclaimed hrefs `apps/vscode/src/services/sceneThumbnailService.ts`
- [ ] T020 [test] Unit tests for `gcOrphanAssets`: unlinks PNGs with no referring Scene; leaves referenced PNGs untouched; returns the list of reclaimed hrefs; handles an empty plot (no scans, no errors) `apps/vscode/src/services/__tests__/sceneThumbnailService.gc.test.ts`

### LogService extension (per `contracts/log-service-extension.md`)

- [ ] T021 Add `StoryboardEditOp` union (extending the re-exported `StoryboardOp` from #215 with `restore | copy-out | refresh-thumbnail | refresh-all-stale`), `STORYBOARD_EDIT_TOOL_SENTINEL = 'debrief.storyboardEdit'`, and `RecordStoryboardEditInput` interface (with `pairActivityId` field per review 3A) to the LogService types `services/session-state/src/log/types.ts`
- [ ] T022 Add `buildStoryboardEditLogEntry(input: RecordStoryboardEditInput): LogEntry` helper producing a `was_generated_by.tool = STORYBOARD_EDIT_TOOL_SENTINEL` shape with `tool_args.{op, sceneId, storyboardId, thumbnailAssetRef, underlyingActivityId, pairActivityId}` `services/session-state/src/log/entryBuilder.ts`
- [ ] T023 Implement `LogService.recordStoryboardEdit(input): Promise<{ activity_id: string }>` using `buildStoryboardEditLogEntry` + existing `appendEntry` path; graceful no-op returning `{ activity_id: "" }` when `storePath`/`itemPath` unset (FR-EDIT-021) `services/session-state/src/log/logService.ts`
- [ ] T024 [test] Unit tests for `recordStoryboardEdit`: sentinel value set correctly; parametrised test across all values of `StoryboardEditOp`; degraded no-op when uninitialised; thrown error inside `appendEntry` propagates to caller; `pairActivityId` round-trips through `getTimeline` `services/session-state/tests/unit/log/logService.test.ts`
- [ ] T025 [P][test] LinkML schema-validation gate (review 10E — Article II.2): assert every `buildStoryboardEditLogEntry` output validates against the JSON Schema generated from the LinkML `LogEntry` definition for every `StoryboardEditOp` value `services/session-state/tests/unit/log/logEntrySchema.test.ts`

### Panel postMessage type extensions (per `contracts/storyboard-panel-messages.md`)

- [ ] T026 Extend the discriminated union `StoryboardPanelToHostMessage` with 10 new outbound variants (scene-title-rename-committed, scene-description-edit-submitted, scene-delete-requested, scene-undo-delete-clicked, scene-update-to-current-clicked, scene-duplicate-clicked, scene-copy-to-other-clicked, scene-refresh-thumbnail-clicked, storyboard-refresh-all-stale-clicked, storyboard-name-rename-committed, storyboard-description-edit-submitted) and `HostToStoryboardPanelMessage` with 3 new inbound variants (scene-edit-form-open, scene-stale-flags-updated, scene-undo-toast-shown) `apps/vscode/src/types/storyboardPanelMessages.ts`
- [ ] T027 Update `StoryboardPanelProps` / `SceneEditViewModel` / `StoryboardEditViewModel` types per `data-model.md §3/§4`. Extend with **optional+defaulted** edit callbacks and per-Scene `isStale`, `unresolvedFeatureIds`, `editFormOpen`, `pendingDelete` view-model fields — keeps #216 / #217 tests compiling unchanged `shared/components/src/panels/StoryboardPanel/types.ts`

### View-model types (per `data-model.md`)

- [ ] T028 [P] Add `DeletedScene` + `deleteActivityIdOf` derived getter (review 7A — no stored `deleteActivityId` field), `StaleFlag` / `StaleFlagCache`, `UpdateToCurrentInput` / `UpdateToCurrentResult`, `RefreshThumbnailResult`, `DuplicateSceneResult`, `CopySceneResult`, `UndoDeleteOutcome` (review 10H) types `apps/vscode/src/services/storyboardEdit.ts`

**Parallel opportunities**:
- T013–T018 (#215 extensions + their tests) run as a unit.
- T019–T020 (#174 extension + test) run in parallel with T013–T018.
- T021–T025 (LogService extension) can start after T021 lands the types.
- T026–T028 (panel + view-model types) run in parallel with all the above.

## Phase 3: User Story 1 — Refine a captured Storyboard (P1)

**Goal**: Every edit op (rename, describe, delete+undo, update-to-current, duplicate, copy-to-other) works end-to-end from panel click → #215 write → LogPanel card. Missing-data routing from #217's hard-block lands on the edit form with unresolved IDs pre-filled.

**Independent test**: Starting from a fixture Storyboard with ≥ 3 Scenes, exercise each edit op and confirm: (a) mutation persists via #215, (b) provenance updated + `HistoryEntry` appended, (c) corresponding card in the Analysis Log Panel with the Scene thumbnail. Covers spec Acceptance Scenarios 1–7.

### Rename, Describe, Delete+Undo (FR-EDIT-001–004, AS-1/AS-2)

- [ ] T029 Implement `StoryboardEditService.renameScene(input): Promise<SceneEditOutcome>` — delegates to #215 `updateScene({ patch: { title } })`; trimmed empty → defaults to `formatDtg(timestamp)`; emits LogEntry via `recordStoryboardEdit` `apps/vscode/src/services/storyboardEdit.ts`
- [ ] T030 Implement `StoryboardEditService.describeScene(input): Promise<SceneEditOutcome>` — delegates to #215 `updateScene({ patch: { description } })`; `null` clears; markdown persisted verbatim `apps/vscode/src/services/storyboardEdit.ts`
- [ ] T031 Implement `StoryboardEditService.deleteScene(input): Promise<DeleteSceneOutcome>` — delegates to #215 `deleteScene`; on success pushes a `DeletedScene` to the `Map<documentUri, SceneFeature[]>` undo buffer (cap 50, FIFO eviction per research.md R1); fires `scene-undo-toast-shown` inbound postMessage `apps/vscode/src/services/storyboardEdit.ts`
- [ ] T032 Implement `StoryboardEditService.undoDeleteScene(input): Promise<UndoDeleteOutcome>` — looks up `DeletedScene`, verifies destination Storyboard still exists (review 10H — returns `{ kind: "unrecoverable-scene", reason: "storyboard-gone" }` on external delete), calls `restoreScene` with `preservedProvenance: deleted.original.properties.provenance`; re-inserts stale cache entry `apps/vscode/src/services/storyboardEdit.ts`
- [ ] T033 Implement the rename/describe/delete/undo-delete command handlers (delegate to the service; handle errors via messages registry; fallback palette prompts via `showInputBox` per `contracts/vscode-commands.md`) `apps/vscode/src/commands/storyboardEdit.ts`
- [ ] T034 [test] Unit tests for rename/describe: success paths, empty-title default, markdown verbatim preservation, LogEntry emission `apps/vscode/src/services/__tests__/storyboardEdit.test.ts`
- [ ] T035 [test] Unit test for deleteScene: soft-delete success → undo buffer push → `scene-undo-toast-shown` dispatched; `unknown-scene` kind on unknown id `apps/vscode/src/services/__tests__/storyboardEdit.test.ts`
- [ ] T036 [test] Unit test — **restore integration (review 9A/9G — FR-EDIT-004, SC-003)**: after `deleteScene` + `undoDeleteScene`, asserts `JSON.stringify(plotBeforeDelete) === JSON.stringify(plotAfterUndo)` (hash-compare, not field-by-field); `provenance[]` equals `[...preDelete, deleteEntry, restoreEntry]` byte-identically `apps/vscode/src/services/__tests__/storyboardEdit.test.ts`
- [ ] T037 [test] Unit test for undo-buffer cap + FIFO eviction: 51st delete evicts index 0; evicted Scene's undo toast is dismissed silently `apps/vscode/src/services/__tests__/storyboardEdit.test.ts`
- [ ] T038 [test] Unit test for external-delete race on undo (review 10H): `undoDeleteScene` after the Storyboard was externally removed returns `{ kind: "unrecoverable-scene", reason: "storyboard-gone" }` and surfaces a red toast via the command handler `apps/vscode/src/services/__tests__/storyboardEdit.test.ts`

### Update-to-current (FR-EDIT-005/006, AS-3)

- [ ] T039 Implement `StoryboardEditService.updateSceneToCurrent(input): Promise<UpdateToCurrentResult>` with the **pre-flight collision check** (review 1A): (1) call `checkSceneTimestamp` first — on conflict return `{ kind: "duplicate-timestamp-collision", existingSceneId, suggestedOffsetTimestamp }` WITHOUT invoking #174; (2) capture thumbnail via `sceneThumbnailService.captureThumbnail`; (3) single `updateScene` call with full patch; (4) update stale cache to `{ stale: false, unresolvedFeatureIds: [] }`; emit log entry `apps/vscode/src/services/storyboardEdit.ts`
- [ ] T040 Implement `updateToCurrentHandler` command: reads current view state from `mapPanel.getCurrentView()`; delegates to service; pattern-matches on result kind; surfaces Replace / Offset / Cancel modal on collision; surfaces red toast on `thumbnail-failed` `apps/vscode/src/commands/storyboardEdit.ts`
- [ ] T041 [test] Unit test for update-to-current success path: viewport + timestamp + visibleFeatureIds + thumbnailAssetRef all re-snapshot atomically in one `updateScene` call `apps/vscode/src/services/__tests__/storyboardEdit.test.ts`
- [ ] T042 [test] Unit test — **pre-collision spy (review 9B — SC-002)**: `checkSceneTimestamp` returns a conflict → `sceneThumbnailService.captureThumbnail` is **never called**; plot byte-identical via `JSON.stringify` hash-compare `apps/vscode/src/services/__tests__/storyboardEdit.test.ts`
- [ ] T043 [test] Unit test for `update-to-current` thumbnail-capture failure: returns `{ kind: "thumbnail-failed" }`; plot byte-identical; no `item.json` entry written `apps/vscode/src/services/__tests__/storyboardEdit.test.ts`

### Duplicate (FR-EDIT-007, AS-4)

- [ ] T044 Implement `StoryboardEditService.duplicateScene(input): Promise<DuplicateSceneResult>` — delegates to #215 `duplicateScene(sceneId, newTimestamp)`; pattern-match on `DuplicateTimestampError` → returns `{ kind: "duplicate-timestamp-collision", existingSceneId, suggestedOffsetTimestamp }` for caller-owned prompt `apps/vscode/src/services/storyboardEdit.ts`
- [ ] T045 Implement `duplicateSceneHandler` command with inline timestamp prompt (default source + 1 s via `showInputBox`) and Replace / Offset / Cancel modal on collision `apps/vscode/src/commands/storyboardEdit.ts`
- [ ] T046 [test] Unit tests for duplicate: default-offset success; collision returns suggestedOffset; log entry emitted with op `duplicate` `apps/vscode/src/services/__tests__/storyboardEdit.test.ts`

### Copy-to-other-storyboard (FR-EDIT-008/009, AS-5)

- [ ] T047 Implement `StoryboardEditService.copySceneToOtherStoryboard(input): Promise<CopySceneResult>` — delegates to #215 `copySceneToOtherStoryboard(sceneId, destinationStoryboardId, newTimestamp, sceneThumbnailService.deepCopyAsset)`; pattern-match on `ThumbnailDeepCopyFailedError` → `{ kind: "deep-copy-failed" }`; pattern-match on collision → `{ kind: "duplicate-timestamp-collision" }` `apps/vscode/src/services/storyboardEdit.ts`
- [ ] T048 Implement the two-card LogPanel emission (review 3A): mint a fresh `pairActivityId` (UUID) + call `recordStoryboardEdit` twice — once with `op: "copy-out"` on source, once with `op: "copy-in"` on destination, both carrying the same `pairActivityId` `apps/vscode/src/services/storyboardEdit.ts`
- [ ] T049 Implement `copyToOtherHandler` command: populates sibling-storyboard quick-pick from the view model; Replace / Offset / Cancel modal on destination collision; red toast on deep-copy failure `apps/vscode/src/commands/storyboardEdit.ts`
- [ ] T050 [test] Unit tests for copy-to-other: success; deep-copy failure rolls back atomically; destination collision returns suggestedOffset; thumbnail assets are distinct files `apps/vscode/src/services/__tests__/storyboardEdit.test.ts`
- [ ] T051 [test] Unit test — **two-card emission (review 9C)**: assert `logService.recordStoryboardEdit` invoked exactly **twice** with matching `pairActivityId`, first with `op: "copy-out"` + source sceneId, second with `op: "copy-in"` + destination sceneId `apps/vscode/src/services/__tests__/storyboardEdit.test.ts`

### Storyboard-level ops (FR-EDIT-012/013)

- [ ] T052 Implement `StoryboardEditService.renameStoryboard(input)` (delegates to #215 `renameStoryboard` with uniqueness enforcement) and `describeStoryboard(input)` (delegates to #215 `describeStoryboard` — the newly-exported helper from T016). Neither path writes Features directly; both flow through the CRUD module (FR-EDIT-022, SC-009) `apps/vscode/src/services/storyboardEdit.ts`
- [ ] T053 Implement `renameStoryboardHandler` + `describeStoryboardHandler` with input-box / in-panel flows; re-prompt on `DuplicateStoryboardNameError` `apps/vscode/src/commands/storyboardEdit.ts`
- [ ] T054 [test] Unit tests for storyboard rename/describe: success, uniqueness rejection, cascade-delete count in log card `apps/vscode/src/services/__tests__/storyboardEdit.test.ts`

### Missing-data routing from #217 hard-block (FR-EDIT-014/015, AS-7)

- [ ] T055 Implement `StoryboardEditService.openSceneForMissingDataEdit(input)` — reads `detectMissingDataForScene`; posts `scene-edit-form-open` inbound message with `missingDataContext` pre-populated; focuses `Update to current` button by default `apps/vscode/src/services/storyboardEdit.ts`
- [ ] T056 Register the replacement `debrief.storyboard.editScene` handler (review R6) — `extension.ts` points the command at `openSceneForMissingDataEdit` and the stub file (T010) is deleted `apps/vscode/src/extension.ts`
- [ ] T057 [test] Unit test for missing-data routing: call → service posts `scene-edit-form-open` with `missingDataContext` populated; clicking `Update to current` from the form triggers `updateSceneToCurrent` with the current map view `apps/vscode/src/services/__tests__/storyboardEdit.test.ts`

### Panel sub-components (per `contracts/scene-edit-form.md`)

- [ ] T058 Implement `SceneEditForm` — inline rename input (Enter commits / Escape reverts / blur commits), markdown textarea + `react-markdown` live preview, missing-data remediation panel (conditional on `missingData.kind !== "ok"` — unresolved-ID list + Update-to-current/Delete buttons), row-action buttons, accessibility attributes (`role="form"`, `aria-label` on inputs, focus traversal Title → Textarea → Save → Cancel → remediation → row actions) `shared/components/src/panels/StoryboardPanel/SceneEditForm.tsx`
- [ ] T059 [P] Implement `UndoToast` (inline presentational variant for Storybook / web-shell — VS Code host uses native `showInformationMessage` for the real path) with `role="status"`, `aria-live="polite"`, dismiss on Escape, `canUndo` prop gating the Undo button `shared/components/src/panels/StoryboardPanel/UndoToast.tsx`
- [ ] T060 [P] Wire the sub-components into `StoryboardPanel.tsx` (thread the edit callbacks, render `SceneEditForm` on `editFormOpen`, render `UndoToast` on pending delete, emit the 10 new outbound messages) `shared/components/src/panels/StoryboardPanel/StoryboardPanel.tsx`
- [ ] T061 [test] Component tests for inline rename: Enter commits; Escape reverts; blur commits; empty title triggers default `shared/components/src/panels/StoryboardPanel/__tests__/StoryboardPanel.test.tsx`
- [ ] T062 [P][test] Component tests for `SceneEditForm`: textarea typing updates live preview; Save button disabled when buffer equals saved value; missing-data panel renders unresolved IDs + two remediation buttons; focus order correct `shared/components/src/panels/StoryboardPanel/__tests__/SceneEditForm.test.tsx`
- [ ] T063 [P][test] Component tests for `UndoToast`: Undo click fires `onUndo`; Escape dismisses; `canUndo: false` disables Undo button; `aria-live` attribute present `shared/components/src/panels/StoryboardPanel/__tests__/UndoToast.test.tsx`
- [ ] T064 Add Storybook stories `WithEditForm`, `WithUndoToast`, `WithMissingDataRemediation` under the existing `StoryboardPanel.stories.tsx` — exercised by Playwright across light / dark / vscode theme variants `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx`

### Panel dispatcher wiring (per `contracts/storyboard-panel-messages.md`)

- [ ] T065 Extend `storyboardPanelView.ts` `onDidReceiveMessage` switch with the 10 new outbound variants (dispatch to `StoryboardEditService` or invoke the corresponding command) and `refresh()` with per-Scene `SceneEditViewModel` shaping (attach `stale`, `unresolvedFeatureIds`, `missingData`, `pendingDelete`) `apps/vscode/src/views/storyboardPanelView.ts`
- [ ] T066 Add the one-line invariant comment to `storyboardPanelView.refresh()` (review 13A): `// INVARIANT: this method must remain O(active-Storyboard Scenes) at spec bound; expensive work here breaks the polish-loop UX (SC-014 / R4).` `apps/vscode/src/views/storyboardPanelView.ts`
- [ ] T067 [test] **Dispatcher tests (review 10F)** — assert each of the 10 new outbound variants dispatches to the correct `StoryboardEditService` method; each of the 3 new inbound variants updates the panel props correctly `apps/vscode/src/views/__tests__/storyboardPanelView.test.ts`

### Web-shell E2E (workflow + evidence screenshots)

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Run `node apps/web-shell/run-playwright.mjs storyboard-edit`. The project uses `@sparticuz/chromium`; standard CDN downloads are blocked but the bundled binary works fully.

- [ ] T068 [test] Web-shell Playwright E2E for the polish loop — rename Scene inline → save description → delete + undo → update-to-current → duplicate → duplicate-at-colliding-timestamp → copy-to-other → induced deep-copy failure → Storyboard cascade-delete confirmation; verify `provenance[]` on each affected Feature; verify LogPanel cards; capture screenshots directly into `specs/218-storyboarding-edit/evidence/screenshots/{rename-and-describe,delete-with-undo,update-to-current,copy-to-other,missing-data-routing,duplicate-timestamp-collision,deep-copy-failure,storyboard-cascade-delete}.png` via the path-resolution pattern in `apps/web-shell/playwright/tests/properties-screenshots.spec.ts` `apps/web-shell/playwright/tests/storyboard-edit.spec.ts`

**Parallel opportunities**:
- T029–T032 (service core edit ops) sequential (shared file).
- T033 (commands) and T034–T038 (tests) run in parallel with each other once T029–T032 land.
- T039 (update-to-current) depends on T014 (`checkSceneTimestamp`) and T019 (thumbnail service untouched for capture path).
- T058–T064 (UI components + tests) run in parallel — different files.
- T068 (E2E) blocked until all Story 1 service + component + command work is green.

## Phase 4: User Story 2 — Detect + refresh stale thumbnails (P2)

**Goal**: Scenes whose `visible_feature_ids` no longer resolve (or whose `feature_set_hash` drifts) are flagged as stale on plot open. A per-Scene Refresh action re-captures via #174; a bulk "Refresh all stale" action rolls up every flagged Scene. Failures surface red toasts and leave provenance untouched.

**Independent test**: Load a fixture Storyboard, mutate the underlying plot so ≥ 1 Scene's `visible_feature_ids` no longer fully resolve. Reopen the plot and confirm: (a) affected Scenes flagged stale in the panel, (b) per-Scene **Refresh thumbnail** regenerates the thumbnail + clears the flag, (c) `feature_set_hash` recomputed + persisted, (d) `refresh-thumbnail` `HistoryEntry` + LogPanel card recorded. Covers Story 2 AS-1/AS-2 + FR-EDIT-024/025.

### Stale-detection pass (FR-EDIT-016/017, SC-004, Story-2 AS-1)

- [ ] T069 Implement `StoryboardEditService.onPlotOpened(documentUri, initialPlot)` — **early-return when plot has zero Storyboards (review 11A)**; otherwise run the stale pass composing #215's `readSceneWithStaleness` + `computeFeatureSetHash` (review 5A) in `Promise.all` across all Scenes; populate the per-plot `StaleFlagCache`; fire `scene-stale-flags-updated` inbound message `apps/vscode/src/services/storyboardEdit.ts`
- [ ] T070 Wire the `onPlotOpened` call into `extension.ts` / `SessionManager.onPlotOpened` so it fires on every plot open `apps/vscode/src/extension.ts`
- [ ] T071 Implement stale-cache invalidation hooks on every mutation path: `updateScene` / `deleteScene` / `createScene` / `restoreScene` touching a Scene update or re-insert the cache entry; `renameScene` / `describeScene` do NOT invalidate (title / description don't affect hash) `apps/vscode/src/services/storyboardEdit.ts`
- [ ] T072 [test] Unit tests for stale pass: all-fresh plot produces all `stale: false`; a Scene whose `visible_feature_ids` has been removed flags `stale: true, unresolvedFeatureIds: [...]`; hash drift without ID absence flags `stale: true, unresolvedFeatureIds: []`; zero-storyboard plot early-returns with no Scene-iteration `apps/vscode/src/services/__tests__/storyboardEdit.test.ts`
- [ ] T073 [test] Unit tests for stale-cache invalidation: `updateScene` → cache entry refreshed with recomputed flag; `deleteScene` → cache entry dropped; `restoreScene` → cache entry re-inserted `apps/vscode/src/services/__tests__/storyboardEdit.test.ts`

### Per-Scene Refresh thumbnail (FR-EDIT-018/019, SC-005, Story-2 AS-2)

- [ ] T074 Implement `StoryboardEditService.refreshSceneThumbnail(input): Promise<RefreshThumbnailResult>` — call `sceneThumbnailService.captureThumbnail`; on success `updateScene({ patch: { thumbnailAssetRef } })`; #215 recomputes `feature_set_hash`; emit `refresh-thumbnail` log entry; update stale cache; on #174 failure return `{ kind: "thumbnail-failed", error }` with byte-identical plot `apps/vscode/src/services/storyboardEdit.ts`
- [ ] T075 Implement `refreshThumbnailHandler` command with red toast on failure (message: *"Refresh failed — could not produce thumbnail. Existing thumbnail kept."*) `apps/vscode/src/commands/storyboardEdit.ts`
- [ ] T076 [test] Unit test for refresh-thumbnail success: #174 called, `updateScene` called with new ref, stale flag clears, log entry emitted `apps/vscode/src/services/__tests__/storyboardEdit.test.ts`
- [ ] T077 [test] Unit test for refresh-thumbnail failure — **SC-005 byte-identical rollback**: #174 throws → `{ kind: "thumbnail-failed" }`; `thumbnail_asset_ref` / `feature_set_hash` / provenance untouched via `JSON.stringify` hash-compare; stale flag persists `apps/vscode/src/services/__tests__/storyboardEdit.test.ts`

### Bulk refresh-all-stale (FR-EDIT-025, new from review fold-in)

- [ ] T078 Implement `StoryboardEditService.refreshAllStaleThumbnails(input): Promise<{ succeeded, failed }>` — enumerate stale-flagged Scenes on the target Storyboard, invoke `refreshSceneThumbnail` per Scene **sequentially** (not parallel — keeps #174's I/O orderly), emit one `refresh-thumbnail` log card per Scene, emit one `refresh-all-stale` rollup card at the end with `{ succeeded, failed }` tallies `apps/vscode/src/services/storyboardEdit.ts`
- [ ] T079 Implement `refreshAllStaleHandler` command: info toast when no stale Scenes; green toast on total success; orange toast naming failed count on partial; per-Scene failures visible in LogPanel `apps/vscode/src/commands/storyboardEdit.ts`
- [ ] T080 Add the Storyboard-level overflow menu entry *Refresh all stale thumbnails* to the panel header (emit the `storyboard-refresh-all-stale-clicked` outbound message) `shared/components/src/panels/StoryboardPanel/StoryboardPanel.tsx`
- [ ] T081 [test] Unit tests for bulk refresh — **SC-012**: iterates every stale Scene; invokes #174 exactly once per Scene; emits exactly one `refresh-thumbnail` card per success + exactly one `refresh-all-stale` rollup; continues on per-Scene failures (doesn't abort) `apps/vscode/src/services/__tests__/storyboardEdit.test.ts`
- [ ] T082 [test] Unit test for no-op path: zero stale Scenes → returns `{ succeeded: [], failed: [] }` + handler surfaces info toast `apps/vscode/src/services/__tests__/storyboardEdit.test.ts`

### StaleBadge UI (FR-EDIT-017)

- [ ] T083 Implement `StaleBadge` presentational component — visible marker + tooltip listing unresolved feature IDs + Refresh-thumbnail button + `aria-describedby` on the badge `shared/components/src/panels/StoryboardPanel/StaleBadge.tsx`
- [ ] T084 Wire `StaleBadge` into the Scene row rendering (conditional on `stale: true` in the view model); emit `scene-refresh-thumbnail-clicked` on refresh click `shared/components/src/panels/StoryboardPanel/SceneRow.tsx`
- [ ] T085 [test] Component tests for `StaleBadge`: tooltip shows unresolved IDs; Refresh click fires callback; accessibility attributes present `shared/components/src/panels/StoryboardPanel/__tests__/StaleBadge.test.tsx`
- [ ] T086 Add Storybook story `WithStaleBadge` (and ensure `WithStaleBadge` exists alongside `WithEditForm` / `WithUndoToast` / `WithMissingDataRemediation` from Story 1) `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx`

### Web-shell E2E for Story 2

- [ ] T087 [test] Web-shell Playwright E2E for stale-detect + refresh — load plot with known-stale fixture, assert stale badges render, click per-Scene refresh, verify flag clears; trigger bulk refresh; capture `evidence/screenshots/refresh-stale.png` + `evidence/screenshots/bulk-refresh-all-stale.png` `apps/web-shell/playwright/tests/storyboard-edit.spec.ts`

**Parallel opportunities**:
- T069 (stale pass) and T070 (wiring) are sequential.
- T074–T077 (per-Scene refresh) and T078–T082 (bulk refresh) run as separate sequential chains but can start in parallel with each other once T069 lands.
- T083–T086 (StaleBadge + tests + story) run in parallel with the service work.
- T087 (E2E) blocked on all Story 2 work green.

## Phase 5: Polish & Cross-Cutting Concerns

**Goal**: Land the cross-cutting items that don't belong to a single user story — orphan-asset gc on plot close, LogPanel consecutive-same-op collapse renderer (FR-EDIT-026), perf-budget test for the stale pass, LinkML round-trip proof, code-server webview E2E for VS Code chrome, evidence artifacts, media content, and the PR. Done when CI is fully green and the PR is open.

### Cross-cutting implementation

- [ ] T088 Implement `StoryboardEditService.onPlotClosed(documentUri, finalPlot)` — invoke `sceneThumbnailService.gcOrphanAssets(finalPlot)` before clearing per-plot state; emit warning to output channel if gc throws (no user toast — FR-EDIT-024 edge case) `apps/vscode/src/services/storyboardEdit.ts`
- [ ] T089 Wire `onPlotClosed` into `SessionManager.onPlotClosed` event stream in `extension.ts` `apps/vscode/src/extension.ts`
- [ ] T090 [test] Integration test for gc-on-plot-close — **SC-011**: after a session with N deletes + M update-to-currents, `gcOrphanAssets` unlinks 100% of orphan PNGs + leaves 100% of live thumbnails untouched `apps/vscode/src/services/__tests__/storyboardEdit.test.ts`
- [ ] T091 Implement LogPanel **consecutive-same-op collapse renderer (FR-EDIT-026)** — group ≥ 3 consecutive `debrief.storyboardEdit` entries with identical `op` + `actor` within a **rolling** 120-second window (each candidate entry checks the 120 s immediately preceding its own timestamp) into a single collapsed card with count + expand action; gated on `debrief.logPanel.collapseConsecutiveSameOp` setting (default `true`) read via the VS Code host's setting channel `shared/components/src/LogPanel/LogPanel.tsx`
- [ ] T092 [test] Component tests for collapse — **SC-013**: with setting on, 3+ consecutive same-op entries render as single card; with setting off, render individually; intervening different-op entry breaks the run; entries straddling the rolling 120 s boundary (119 s joins the run / 121 s breaks it) behave correctly; expanding reveals individual entries `shared/components/src/LogPanel/__tests__/collapse.test.tsx`

### Perf budget (review 4A, SC-014)

- [ ] T093 [test] Perf-budget test for stale pass — load fixture plot with 5 Storyboards × 50 Scenes = 250 hash recomputations; assert `onPlotOpened` completes in **≤ 50 ms on the reference CI runner**; run 10 iterations and assert median + p95 both within bound; CI fails on regression `apps/vscode/src/services/__tests__/storyboardEdit.perf.test.ts`

### Code-server webview E2E (VS Code chrome coverage)

- [ ] T094 [test] Code-server Playwright E2E for VS Code-native UX (input-box, quick-pick, native toasts, Storyboard overflow menu, command palette invocation) covering all 10 new commands end-to-end; capture `evidence/screenshots/vscode-native-chrome.png` showing a real VS Code input box + quick pick mid-flow `tests/e2e/test-storyboard-edit.spec.ts`

### Evidence artifacts

- [ ] T095 Capture test results using the template at `.specify/templates/evidence/test-summary-template.md` (YAML front matter: `feature: 218-storyboarding-edit`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`; body: total tests, key scenarios verified, per-phase tallies) `specs/218-storyboarding-edit/evidence/test-summary.md`
- [ ] T096 Create end-to-end usage demonstration walking through the polish loop (rename → describe → delete+undo → update-to-current → duplicate → copy-to-other → refresh stale → bulk refresh) with expected LogPanel cards screenshot and exact keyboard/mouse affordances `specs/218-storyboarding-edit/evidence/usage-example.md`
- [ ] T097 Run the web-shell E2E via `node apps/web-shell/run-playwright.mjs storyboard-edit` and confirm all screenshots in the **Evidence Requirements** table land under `specs/218-storyboarding-edit/evidence/screenshots/` including `interaction.gif` (< 5s, < 2MB) `specs/218-storyboarding-edit/evidence/screenshots/`
- [ ] T098 [P] Capture code-server webview E2E summary with command-palette + input-box + quick-pick + toast coverage `specs/218-storyboarding-edit/evidence/webview-e2e-summary.md`
- [ ] T099 [P] Capture perf-budget CI report showing stale-pass median + p95 within the 50 ms bound at spec scale `specs/218-storyboarding-edit/evidence/perf-budget-report.md`
- [ ] T100 [P] Capture LinkML round-trip proof for the new `LogEntry` sentinel — Python → JSON → TypeScript → JSON round-trip for every `StoryboardEditOp` value (review 10E, Article II.2) `specs/218-storyboarding-edit/evidence/round-trip-logentry.md`

### Media content

- [ ] T101 Create shipped blog post via Content Specialist agent (`.claude/agents/media/content.md`) — sections: What We Built, Screenshots (embedded from `evidence/screenshots/`), Key Decisions (selected from research.md R1–R7), Lessons Learned (notable surprises: orphan-asset window + pre-flight, two-card copy emission + pairActivityId, composing `readSceneWithStaleness`), What's Next (Storyboarding v2 epic — #229) `specs/218-storyboarding-edit/media/shipped-post.md`
- [ ] T102 [P] Create LinkedIn shipped summary (150–200 words, hook opening, link placeholder `{{POST_URL}}`, hashtags `#FutureDebrief #MaritimeAnalysis #OpenSource`) `specs/218-storyboarding-edit/media/linkedin-shipped.md`

### Final verification + PR

- [ ] T103 Run the full CI check locally per CLAUDE.md §Before Pushing — `task verify` (lint + typecheck + test) — all green; fix any drift before proceeding
- [ ] T104 Create PR and publish blog: run `/speckit.pr` — this task MUST be the final task, depends on every task above being complete; triggers PR creation in `debrief-future` + shipped-post publication to `debrief.github.io`

**Task T104 must run last.** It depends on all evidence, media, and verification tasks completing green.

**Parallel opportunities**:
- T088–T090 (gc plumbing) and T091–T092 (collapse renderer) run in parallel.
- T093 (perf budget) runs in parallel with the others.
- T094 (code-server E2E) runs in parallel with T088–T093.
- T095–T100 (evidence capture) run in parallel once tests are green.
- T101–T102 (media) run in parallel once evidence lands.

## Dependencies

### Cross-phase ordering

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Foundation)
    ├── #215 extensions: restoreScene + checkSceneTimestamp + StoryboardOp export
    ├── #174 extension: gcOrphanAssets
    ├── LogService.recordStoryboardEdit + pairActivityId + sentinel
    ├── Panel postMessage type extensions
    └── View-model types
    │
    ▼
Phase 3 (User Story 1 — P1) ◄── independently shippable increment
    │        Requires all of Phase 2
    │        Delivers: rename, describe, delete+undo, update-to-current,
    │                  duplicate, copy-to-other + all log cards +
    │                  missing-data routing
    ▼
Phase 4 (User Story 2 — P2) ◄── independently shippable increment
    │        Requires Phase 3's update-to-current + copy-to-other
    │        for stale-cache invalidation tests
    │        Delivers: stale detection + per-Scene refresh +
    │                  bulk refresh-all-stale
    ▼
Phase 5 (Polish + Evidence + PR)
    │        gc on plot close, LogPanel collapse renderer,
    │        perf budget, code-server E2E, evidence,
    │        shipped post, PR
```

### Inter-task dependencies (notable)

- **T013 (restoreScene) blocks T032** (`undoDeleteScene` uses it) and **T036** (the byte-identical restore test).
- **T014 (checkSceneTimestamp) blocks T039** (pre-flight collision) and **T042** (the pre-collision spy test — the cornerstone regression guard for review 1A).
- **T019 (gcOrphanAssets) blocks T088** (on-plot-close wiring) and **T090** (SC-011 integration test).
- **T021–T023 (LogService extension) blocks every service method that emits a log card** — T029, T031, T039, T044, T047, T052, T074, T078.
- **T025 (LinkML round-trip test) blocks T100** (evidence artifact).
- **T056 (edit-service stub replacement) blocks T068** (E2E exercises the missing-data routing).
- **T093 (perf budget test) blocks T099** (perf budget evidence artifact).
- **T103 (verify gate) blocks T104 (PR)** — must see all-green CI before opening the PR.
- **T104 (`/speckit.pr`) is the terminal task** — it waits on every other task in Phases 1–5.

### Independent-test boundaries

- **After Phase 3**: Story 1 alone passes its independent test (polish loop end-to-end, missing-data routing). Ready to merge as a partial slice if Phase 4 is delayed (but spec-level FR-EDIT-024/025/026 would be unmet).
- **After Phase 4**: Story 2 adds stale detection + refresh. Story 1 tests remain green. Bulk refresh (FR-EDIT-025) ships here.
- **After Phase 5**: All FRs including the three review-added ones (024/025/026) satisfied; evidence + media + PR ready.

## Implementation Strategy

### Incremental delivery

The plan is designed for three natural checkpoints where a partial merge to main would be meaningful:

1. **After Phase 2 (Foundation)**: every primitive has passing unit tests; nothing is wired up end-to-end. Useful checkpoint if the #215 additive extensions need review by the schema owners before dependent work proceeds.
2. **After Phase 3 (Story 1)**: the headline polish-loop features ship. An analyst can rename / describe / delete+undo / update-to-current / duplicate / copy a Scene; the LogPanel shows every edit; missing-data routing works. This is the **minimum viable edit suite**; Phase 4 could be deferred to a follow-up sprint if time is tight.
3. **After Phase 4 (Story 2)**: stale detection + refresh ship (per-Scene and bulk). With Phase 3 + Phase 4 merged, spec FR-EDIT-001–023 are all satisfied.
4. **After Phase 5 (Polish)**: FR-EDIT-024/025/026 from the review fold-in land (gc on plot close, bulk-refresh rollup card, LogPanel collapse) + full evidence + media + PR.

### Parallel execution guidance

Tasks tagged `[P]` in a single phase can run concurrently because they touch different files. Within a phase, the sequencing is typically: **service method → command handler → component → test**. Tests marked `[P][test]` are independent of each other and can run as a batch.

For agent-driven implementation, a reasonable cadence is:
- Phase 1: spawn one agent running T001–T011 sequentially (tight-knit scaffolding).
- Phase 2: split into four parallel streams — (a) T013–T018 #215 extensions, (b) T019–T020 #174 extension, (c) T021–T025 LogService, (d) T026–T028 types. Reconverge before Phase 3.
- Phase 3: sequence the service work T029–T057 (mostly one file — `storyboardEdit.ts`). Run T058–T064 (UI + component tests) in parallel. T065–T068 serialise last.
- Phase 4: T069–T082 on service; T083–T086 on `StaleBadge`; parallel. T087 (E2E) last.
- Phase 5: T088–T094 parallel-ish (distinct files). T095–T100 parallel after tests green. T101–T102 parallel. T103 → T104 sequential.

### Review gates

- **After Phase 2**: open a draft PR early if #215 / #174 surface changes want schema-owner sign-off before the rest lands.
- **After Phase 3 merge**: confirm LogPanel card emission for every edit op against the Acceptance Scenarios before Story 2 starts.
- **Before T104 (PR)**: run `/speckit.analyze 218` for a cross-artifact consistency check if anything in the spec/plan drifted during implementation.

### Risk notes

- **T039 (update-to-current pre-flight)** — the cornerstone of review decision 1A. If the pre-flight is skipped or short-circuited, orphan thumbnail assets are possible; the regression is caught by T042 (spy on `captureThumbnail`). Implementers MUST NOT refactor T039 without re-running T042.
- **T048 (copy-to-other two-card emission)** — the `pairActivityId` MUST be minted once and passed to both `recordStoryboardEdit` calls. Passing two separate UUIDs silently breaks LogPanel linkage without failing any test other than T051.
- **T069 (stale pass composition)** — MUST use `readSceneWithStaleness` + `computeFeatureSetHash` per review 5A. Re-reading `scene.properties.feature_set_hash` directly is a DRY violation; no test enforces this explicitly, but a code review should catch it.
- **T091 (LogPanel collapse)** — lives in `shared/components/src/LogPanel/`, a file #176 owns. Coordinate with #176's maintainers; keep the renderer setting-gated so default-off users get the old behaviour verbatim.
