---
feature: "218-storyboarding-edit"
captured_at: "2026-04-24T12:42:33Z"
git_sha: "415df9e3"
tests_passed: 2983
tests_failed: 0
tests_skipped: 4
coverage_pct: null
---

# Test Summary: Storyboarding — Edit Suite + Housekeeping

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 2987 |
| Passed | 2983 |
| Failed | 0 |
| Skipped | 4 |
| Coverage | not measured |

Totals across three workspaces:

| Workspace | Passed | Skipped | Delta vs. main |
|-----------|--------|---------|----------------|
| `apps/vscode` (vitest) | 543 | 0 | +54 |
| `shared/components` (vitest) | 1802 | 4 | +62 |
| `services/session-state` (vitest) | 638 | 0 | +15 |

## Test Breakdown

### Service / orchestration (apps/vscode)

| Test suite | Count | Focus |
|------------|-------|-------|
| storyboardEditService.test.ts | 37 | Service-layer edit ops, stale pass, refresh, bulk refresh, undo round-trip, plot-close gc |
| storyboardEditService.perf.test.ts | 1 | SC-014 stale-pass perf budget at spec scale (5×50 = 250 scenes) |
| sceneThumbnailService.test.ts | 19 | Thumbnail write / delete + gcOrphanAssets orphan reclamation |
| storyboardPanelView.test.ts | 20 | Panel dispatcher routing (11 outbound variants + sink installation) |

### #215 CRUD module extensions (shared/components)

| Test suite | Count | Focus |
|------------|-------|-------|
| storyboard/crud.test.ts | 29 | restoreScene byte-identical, checkSceneTimestamp scoping, describeStoryboard |

### LogService extension (services/session-state)

| Test suite | Count | Focus |
|------------|-------|-------|
| logService.test.ts | 33 | recordStoryboardEdit parametrised over every StoryboardEditOp + FR-EDIT-021 degraded path + pairActivityId pair emission |

### Presentational components (shared/components)

| Test suite | Count | Focus |
|------------|-------|-------|
| SceneEditForm.test.tsx | 22 | Title rename, description dirty/save/cancel, missing-data remediation, row actions, a11y |
| UndoToast.test.tsx | 7 | Render shape, Undo/Dismiss, canUndo gating, Escape, aria-live |
| StaleBadge.test.tsx | 6 | Tooltip truncation, stopPropagation, a11y |
| StoryboardPanel.test.tsx | 23 | Edit-form inline render, pendingDelete hides row, UndoToast, row-action delegation |
| collapseStoryboardEdits.test.ts | 11 | FR-EDIT-026 rolling-window collapse + SC-013 immutability |

## Key Scenarios Verified

- **SC-003 undo byte-identical restore** — hash-equality between pre-delete and post-undo plot provenance (hash-compare per review 9G)
- **SC-002 atomicity under failure** — plot byte-identical when `captureThumbnail` throws during `updateSceneToCurrent`
- **Review 1A pre-flight** — `captureThumbnail` is NOT called when `checkSceneTimestamp` returns a conflict
- **Review 3A two-card emission** — `copy-out` / `copy-in` log entries carry a shared freshly-minted `pairActivityId`
- **Review 10H storyboard-gone** — `undoDeleteScene` returns `{ unrecoverable-scene, storyboard-gone }` when the parent Storyboard was externally removed
- **Review 11A early-return** — `onPlotOpened` skips iteration on zero-storyboard plots
- **FR-EDIT-024 orphan gc** — `gcOrphanAssets` unlinks unreferenced PNGs and leaves live thumbnails untouched
- **FR-EDIT-025 bulk refresh** — `refreshAllStaleThumbnails` emits exactly one per-Scene card + one rollup card; continues on per-Scene failures
- **FR-EDIT-026 collapse** — ≥3 consecutive same-(op,actor) entries within rolling 120 s collapse to one card; the underlying timeline is byte-identical (SC-013)
- **SC-014 perf budget** — 250-Scene stale pass completes under 50 ms median on the reference runner

## Known Issues

- 4 skipped tests in `shared/components` (pre-existing, unrelated to #218)

## Environment

- Runner: vitest (all three workspaces) + Node 20
- Branch: `218-storyboarding-edit`
- Date: 2026-04-24
