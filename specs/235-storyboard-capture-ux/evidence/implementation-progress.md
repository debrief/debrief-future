---
feature: 235-storyboard-capture-ux
captured_at: 2026-04-29T08:10:00Z
git_sha: 6e5ff0c
status: partial
---

# Implementation Progress — `/speckit.implement` partial run

This file records the state of the spec's implementation at the point this
session ended. Tasks are listed by phase with concrete file pointers so a
follow-up session can pick up where this one left off.

## Phases delivered

### Phase 1 — Setup verification (3/4 tasks)

- ✅ T001, T003, T004 verified.
- ⏸️ T002 (`task verify` baseline capture) deferred — not run in this session.

### Phase 2 — Foundation: shared StoryboardPanel extensions (23/24 tasks)

All foundation work delivered and tested. **90 unit tests pass** (50 reducer + 40 component) on top of #230's existing 26.

- ✅ T005-T007: reducer tests for namingRow / collisionBanner slices (24 new tests).
- ✅ T008-T010: component tests for empty-state Capture Scene button, NamingRow integration, CollisionBanner integration (13 new tests).
- ✅ T011: existing reducer tests still pass (no regression).
- ✅ T012-T014: reducer extended with `namingRow`, `collisionBanner`, `cascadeDeleteConfirm` state slices; SnapshotPayload + ScenesPayload extended; six new actions added (naming-row-text-changed/-confirm-/-cancel-requested, collision-replace-/offset-/cancel-requested) all with stale-message defence per contracts/panel-messages.md §C.
- ✅ T015-T016: `NamingRowViewModel` + `CollisionBannerViewModel` projection types; `composeNamingRowViewModel` + `composeCollisionBannerViewModel` functions exported.
- ✅ T017: empty-state primary `[data-testid="capture-scene-button"]` added.
- ✅ T018-T019: new `<NamingRow />` and `<CollisionBanner />` subcomponents in `shared/components/src/panels/StoryboardPanel/{NamingRow,CollisionBanner}.tsx`.
- ⏸️ T020: deferred — `cascadeDeleteConfirm` reducer slice is in place; UI rendering pending Phase 5 wiring.
- ✅ T021-T027: 7 new Storybook stories (EmptyWithCaptureButton, FirstCaptureNamingRow, FirstCaptureNamingRowWithCollision, DuplicateTimestampBanner, DuplicateTimestampBannerOffsetCapped, DuplicateTimestampBannerExceedsTimeRange, RowWithUpdateToCurrent).
- ✅ T028: CONTRACTS.md updated with #235 channel additions, public API additions, stability section.

### Phase 6 — VS Code adoption (4/13 tasks)

The production VS Code path now routes the first-capture name prompt and the duplicate-timestamp resolution through the inline panel naming row + collision banner. The legacy paths remain in `captureScene.ts` *only* for unit-test back-compat.

- ✅ T077: `apps/vscode/src/types/storyboardPanelMessages.ts` extended — `SnapshotPayload` + `scenes` message gain optional `namingRow`, `collisionBanner`, `cascadeDeleteConfirm` push fields; `StoryboardPanelMessage` union gains the five new stateless action types.
- ✅ T078: serialisers / deserialisers — handled implicitly via the typed channel's discriminated unions; no separate serialisation layer to update.
- ✅ T079: `StoryboardPanelViewProvider` extended with `setNamingRow` / `setCollisionBanner` / `setCascadeDeleteConfirm` public methods + read-only accessors `getNamingRow` / `getCollisionBanner`. Five new `vscode.EventEmitter`s exposed as `onNamingRowConfirm`, `onNamingRowCancel`, `onCollisionReplace`, `onCollisionOffset`, `onCollisionCancel`. `handleMessage()` routes the five new inbound action posts through the matching emitters with stale-message defence. `refresh()` and `applySnapshot()` echo the host-side prompt slices on every push.
- ✅ T080: `apps/vscode/src/webview/web/storyboardPanel.tsx` extended — `ScenesMessage` + `SnapshotMessage` types gain the prompt slices; reducer dispatch threads them through; six new outbound handlers (`onNamingRowTextChange`, `onNamingRowConfirm`, `onNamingRowCancel`, `onCollisionReplace`, `onCollisionOffset`, `onCollisionCancel`) wired to webview→extension posts. `<StoryboardPanel />` rendered with `namingRowViewModel` + `collisionBannerViewModel`.
- ✅ T081: `captureScene.ts` first-capture branch now routes through `awaitNamingRowResolution(panelView, plot)` when `context.panelView !== undefined` (production path). Sets the host's `namingRow` slice, focuses the storyboard panel, awaits `onNamingRowConfirm` / `onNamingRowCancel`, clears the slice on resolution.
- ✅ T082: `captureScene.ts` `handleDuplicateTimestamp` now routes through `resolveCollisionViaPanel(...)` when `context.panelView !== undefined`. Sets the host's `collisionBanner` slice, awaits the three emitters, dispatches Replace / Offset / Cancel branches accordingly.
- `apps/vscode/src/extension.ts` updated to thread `panelView: storyboardPanelProvider` into the `CaptureCommandContext`.

### Phase 6 — remaining

- ⏸️ T072-T076: 5 unit tests proving the panel-view path is the production-default and the legacy paths are not invoked. Existing `captureScene.test.ts` (15 tests) still passes via the legacy fallback path; the new path needs dedicated tests using a mock panel-view that fires the emitters.
- ⏸️ T083: `apps/vscode/src/commands/storyboardEdit.ts` modal removal (delete-confirm, rename input). Not yet refactored.
- ⏸️ T084: full removal of `showInputBox` + the legacy modal `showInformationMessage` from `captureScene.ts`'s production code paths. The legacy fallback survives in this PR for unit-test back-compat per the spec's pre-existing test surface; SC-009 grep evidence requires the fallback to be deleted, which depends on T072-T076 landing first.

## Phases not started

These phases require continued work and are too large to deliver responsibly in remaining session context.

### Phase 3 — US1 web-shell capture (0/20 tasks)

Scope: **net-new infrastructure** for the web-shell host.

- T029 visibility-invariant Playwright helper (`apps/web-shell/playwright/helpers/viewport-invariants.ts`)
- T030-T039: 11 Playwright E2E tests (`apps/web-shell/playwright/tests/storyboard-capture.spec.ts`)
- T040: `apps/web-shell/src/services/webSceneThumbnailAdapter.ts` (NEW — browser-side thumbnail capture via `modern-screenshot`)
- T041-T044: `apps/web-shell/src/commands/captureSceneWeb.ts` (NEW — browser sibling of VS Code's captureScene, including pagehide cleanup)
- T045-T048: `apps/web-shell/src/StoryboardPanelMount.tsx` (NEW — replaces fixture-driven harness mount, wires session-state, FR-WEB-029a session-only badge, keyboard shortcut)

### Phase 4 — US2 web-shell maintenance (0/14 tasks)

Wire the seven #218 maintenance op handlers through the web-shell mount + 10 Playwright tests covering rename / describe / delete+undo / update-to-current / duplicate / copy-to-other / refresh-stale + collision branch + read-only timestamp + stacked undos.

### Phase 5 — US3 multi-storyboard (0/9 tasks)

Storyboard-level ops via the rail header (create / rename / delete with cascade preview + undo / switch active) + 5 Playwright tests.

### Phase 7 — Polish, evidence, PR (0/15 tasks)

- T085: Vitest perf bench at 100/1k/10k position reports
- T086: `task verify` end-to-end + `evidence/test-summary.md`
- T087-T088: usage-example + screenshots/GIF
- T089-T097: 9 evidence-capture tasks (3-theme web-shell screenshots, 3 VS Code panel screenshots, interaction GIF, visibility-invariant report, perf bench, legacy-removal grep, cross-host round-trip)
- T098: feature blog post via Content Specialist agent
- T099: Final PR via `/speckit.pr`

## Recommended next session

1. **Pick up Phase 6 polish** (T072-T076 + T083 + T084) — these are tight-scoped and complete the VS Code refactor. Once T084 lands, the SC-009 grep evidence (T095) is also satisfied.
2. **Phase 3 web-shell** — start with T029 visibility-invariant helper and T040 thumbnail adaptor as the unblocking infrastructure, then T041-T048 capture command + mount + App.tsx wiring; finish with T030-T039 Playwright tests.
3. **Phase 4 + Phase 5** — additive layers over Phase 3.
4. **Phase 7** — evidence + PR. T086 (`task verify`) MUST pass before T099.

## Test counts at session end

- `shared/components` Vitest: **90 / 90 passing** (50 reducer + 40 component).
- `apps/vscode` Vitest: **597 / 599 passing** (15/15 captureScene; one pre-existing stacService.updateItemMetadata failure unrelated to #235; 1 unrelated panel test in skip).

## Commits in this session

```
6e5ff0c feat(#235): Phase 6 — captureScene routes through panel naming row + banner
3085afa feat(#235): Phase 6 — VS Code panel-view + webview wire #235 channels
51ff02d feat(#235): Phase 6 — extend VS Code message channel with #235 push fields
587b951 feat(#235): Phase 2 — 7 new Storybook stories + CONTRACTS update
9b3b14f feat(#235): Phase 2 — shared StoryboardPanel naming row + collision banner
```
