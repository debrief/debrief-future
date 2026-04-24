# Quickstart — Storyboarding Edit Suite + Housekeeping

**Feature**: 218-storyboarding-edit
**Audience**: Implementers of this slice; QA running the manual
verification script; reviewers preparing stakeholder demos; authors
of any follow-up storyboarding work beyond the epic.

This quickstart walks a developer through standing up the polish
slice from a clean clone, verifying the acceptance scenarios end-
to-end, and running it on the review-app preview where stakeholders
will exercise it.

---

## 1. Prerequisites

- Node 20+, pnpm 9+, Python 3.11 + uv, VS Code 1.85+.
- Clone includes `main` merged up to the #217 **Storyboarding
  Panel + Playback** slice (`StoryboardPanel` with dropdown +
  transport row; `StoryboardPlaybackService`; `MapView.flyTo` +
  `SceneRectangleLayer`; `debrief.storyboard.editScene` stub
  command).
- Preview-app sample data: `preview/workspace/samples/local-store/`
  carries at least one `.rep` plot with a Storyboard already
  captured (via #216's capture flow) — 3+ Scenes recommended so the
  rename / describe / delete / duplicate / copy ops all have
  meaningful targets.
- The `sceneThumbnailService` (#174 + #216) can write to
  `preview/workspace/` — verify with `ls -la preview/workspace/
  samples/local-store/*/assets/` showing existing thumbnails.

---

## 2. Clean-build from scratch

```bash
cd ~/dev/debrief-future
git switch 218-storyboarding-edit              # this feature's branch
pnpm -w install
pnpm --filter @debrief/schemas build            # LinkML regen (no deltas, but seed artefacts)
pnpm --filter @debrief/session-state build      # includes new recordStoryboardEdit
pnpm --filter @debrief/components build
pnpm --filter @debrief/vscode build
```

Expected: clean typecheck across all four packages. The
`services/session-state` build surfaces the new `StoryboardEditOp`
union + `STORYBOARD_EDIT_TOOL_SENTINEL` export.

---

## 3. Run the unit tests (≈ 45 s)

```bash
pnpm --filter @debrief/session-state test       # includes recordStoryboardEdit suite
pnpm --filter @debrief/components test          # StoryboardPanel suite — includes SceneEditForm, UndoToast, StaleBadge
pnpm --filter @debrief/vscode test              # includes storyboardEdit.test.ts + storyboardEditCommands.test.ts
```

Every Acceptance Scenario in spec.md maps 1:1 to a named test.
Failing tests surface the exact FR / Scenario id in the message.

---

## 4. Run the Storybook E2E (theme coverage + a11y)

```bash
pnpm --filter @debrief/components storybook:build
pnpm --filter @debrief/components test:e2e       # runs Playwright against the static build
```

Verifies `WithEditForm`, `WithUndoToast`, `WithStaleBadge`,
`WithMissingDataRemediation` stories render clean under
`light` / `dark` / `vscode` themes and pass `@axe-core/playwright`.

Evidence screenshots land in
`specs/218-storyboarding-edit/evidence/storybook/`.

---

## 5. Run the web-shell E2E (workflow screenshots + GIF)

```bash
cd apps/web-shell
node run-playwright.mjs storyboard-edit
cd ../..
```

The web-shell test drives the full polish loop and captures:

- `evidence/screenshots/rename-and-describe.png`
- `evidence/screenshots/delete-with-undo.png`
- `evidence/screenshots/update-to-current.png`
- `evidence/screenshots/refresh-stale.png`
- `evidence/screenshots/log-panel-with-edit-cards.png`
- `evidence/screenshots/polish-loop.gif` — one interaction GIF
  covering rename → describe → delete+undo → refresh-stale.

These are the source-of-record for the blog post + PR body.

---

## 6. Run the code-server webview E2E

```bash
pnpm -w e2e:storyboard-edit
# equivalent to: pnpm --filter @debrief/vscode run e2e tests/e2e/test-storyboard-edit.spec.ts
```

Verifies the edit flow against real VS Code chrome (native input
boxes, quick pick, error/info toasts, command palette). Captures the
`showInputBox` + `showQuickPick` + `showErrorMessage` flows that the
web-shell can't drive.

---

## 7. Manual verification (≈ 7 min)

Open the review app (Heroku Review App or local code-server at
`http://localhost:8000`), then:

### 7.1 Refine a captured Storyboard (User Story 1)

1. Open a plot with a multi-Scene Storyboard (e.g.,
   `preview/workspace/samples/local-store/.../plot-01.geojson`).
2. Click the first Scene's title inline → type "Leg 1 departure"
   → Enter. ✅ Title updates; Log Panel (#176) shows a
   `storyboard-edit` card with op `rename`.
3. Expand the row → type a description with markdown (e.g.,
   `**Contact at 14:30Z**`) → Save. ✅ Preview matches; card lands
   with op `describe`.
4. Overflow → Delete. ✅ Toast appears with Undo; row disappears.
   Click Undo. ✅ Row reappears byte-identically; a
   `restore` card lands on top of the `delete` card.
5. Pan / zoom the map, Overflow → Update to current. ✅ Scene
   thumbnail + viewport refresh; card lands with op
   `update-to-current`.
6. Overflow → Duplicate. Inline prompt shows `timestamp + 1s`.
   Confirm. ✅ New Scene appears; card lands with op `duplicate`.
7. Overflow → Copy to other Storyboard → pick sibling. ✅ New
   Scene appears on the destination Storyboard with a distinct
   thumbnail asset; card lands with op `copy-in`.
8. Open the Log Panel and verify the full edit history (rename,
   describe, delete, restore, update-to-current, duplicate,
   copy-in) is present with correct Scene thumbnails.

### 7.2 Refresh a stale thumbnail (User Story 2)

1. Edit the source plot outside VS Code to remove one of the
   features referenced by a Scene's `visible_feature_ids` (test hook
   `preview/workspace/samples/stale-fixture.geojson`).
2. Reopen the plot. ✅ The affected Scene's row shows the
   `StaleBadge` with a tooltip listing the unresolved IDs.
3. Click **Refresh thumbnail**. ✅ Thumbnail regenerates; badge
   clears; a `refresh-thumbnail` card lands in the Log Panel.

### 7.3 Missing-data routing (FR-EDIT-014 / 015)

1. With #217's playback active, press Forward until you land on a
   Scene whose `detectMissingDataForScene !== "ok"`. ✅ Hard-block
   modal surfaces.
2. Click **Open for editing**. ✅ Edit form opens expanded with
   the missing-data details panel visible and the unresolved IDs
   listed.
3. Click **Update to current**. ✅ Scene re-snapshots with the
   current state; a `update-to-current` card lands; the hard-block
   clears on the next advance.

### 7.4 Atomicity under failure (SC-002 / SC-005)

With the `debrief.storyboard.failNextThumbnail` debug toggle on:

1. Update-to-current. ✅ Red toast surfaces; plot FeatureCollection
   is byte-identical (diff the file before/after in a shell).
2. Refresh stale thumbnail. ✅ Red toast surfaces; stale flag
   persists; plot byte-identical.

---

## 8. Cross-references

- **CRUD entrypoints**:
  `@debrief/components/storyboard` — `updateScene`, `deleteScene`,
  `duplicateScene`, `copySceneToOtherStoryboard`, `renameStoryboard`,
  `createScene`, `restoreScene` (the last added additively here;
  see `contracts/edit-service.md` §Implementation note).
- **Thumbnail pipeline**:
  `apps/vscode/src/services/sceneThumbnailService.ts` —
  `captureThumbnail`, `deepCopyAsset`.
- **LogService recorder**:
  `services/session-state/src/log/logService.ts` —
  `recordStoryboardEdit` (NEW).
- **Hard-block landing** (from #217):
  `debrief.storyboard.editScene` command id — now handled by
  `StoryboardEditService.openSceneForMissingDataEdit`.

---

## 9. Known trade-offs (for reviewers)

- **Undo buffer cap at 50**: eviction is silent (the delete
  LogEntry stays on the audit trail). Documented in research.md R1.
- **Orphan thumbnail on `updateScene` collision**: if #215 rejects
  the patch with `DuplicateTimestampError` after #174 has already
  captured a fresh asset, the asset is orphaned until #174's gc
  pass. Documented in research.md R5.
- **Copy-to-other emits one LogCard, two provenance entries**:
  deliberate (user-mental-model vs. wire-format), documented in
  data-model.md §8.

---

## 10. If something breaks

- **Edit form doesn't show missing-data details**: confirm #217's
  stub was actually replaced (`ripgrep storyboardEditStub` should
  return no hits).
- **Undo toast never appears**: check
  `storyboardEdit.test.ts::deleteScene emits UndoToastState`; if
  green, the panel's `scene-undo-toast-shown` handler isn't wired.
- **Log Panel has no storyboard-edit cards**: check `LogService.is-
  InitialisedFor`; the LogService must be seeded for the active
  plot before the first edit op.
- **Stale badge shows on Scenes that are fresh**: verify
  `canonicaliseVisibleFeatureIds` produces the same ordering for
  the stored + recomputed hash — the pass uses #215's canonicaliser,
  so drift would indicate #215 changed semantics.
