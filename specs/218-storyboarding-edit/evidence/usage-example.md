# Usage example — polishing a captured Storyboard

End-to-end walkthrough of the Storyboarding edit suite (#218).
Starting point: a plot with an existing Storyboard and three Scenes
captured via #216 / browsed via #217's panel.

## Scenario

An analyst has just completed a capture pass. Three Scenes land in
the panel with DTG-default titles (`201400Z APR 26`, `201415Z APR 26`,
`201435Z APR 26`). They want to polish the narrative for briefing.

## Step 1 — Inline-rename

Click the Scene title in the row → input field appears pre-filled.
Type `Exercise start — North channel` → press Enter.

Expected:
- Row updates with the new title
- Analysis Log Panel (#176) shows a new card: `rename "201400Z APR 26" → "Exercise start — North channel"` with the Scene's thumbnail

## Step 2 — Markdown description

Expand the row (click the expand affordance) → the `SceneEditForm`
unfolds with a markdown textarea + live preview.

Type:
```markdown
**Brief:** contact gained bearing 023°. Hold course until
commander's view resolves.
```

Click `Save description`.

Expected:
- Save button was disabled while buffer == saved, enables once dirty
- Preview pane renders the markdown (plain-text fallback shown when
  `renderMarkdown` not injected)
- LogPanel card: `describe scene at 2026-04-20T14:00:00Z`

## Step 3 — Delete with undo window

Click `Delete` in the expanded form's row actions.

Expected:
- Row disappears from the list (`pendingDelete` hides it)
- `UndoToast` renders at the panel bottom with the scene title + an
  Undo button (session-scoped — stays until plot close or until the
  buffer evicts this entry)
- LogPanel card: `delete scene "Exercise start — North channel"`

Click `Undo` within the session:
- Row reappears byte-identically (same `id`, same `provenance[]` tail
  + a new `restore` entry)
- LogPanel card: `restore scene "Exercise start — North channel"`

## Step 4 — Update to current

Pan/zoom the map to reframe on the new area of interest; let the
time slider advance to `14:05:00Z`. Click `Update to current` in the
expanded form.

Expected:
- Scene re-snapshots viewport + timestamp + visibleFeatureIds +
  thumbnail_asset_ref as a single atomic write
- LogPanel card: `update-to-current scene at 2026-04-20T14:05:00Z`
- Pre-flight collision check runs BEFORE the thumbnail capture
  (review 1A) — on collision the analyst gets a Replace/Offset/
  Cancel modal, no orphan PNGs are written

## Step 5 — Duplicate at a new timestamp

Overflow menu → `Duplicate`. Input box defaults to `source + 1 s`.

Expected:
- New Scene with a fresh ULID lands at the prompted timestamp
- LogPanel card: `duplicate scene → 2026-04-20T14:05:01Z`
- On collision: `{ Replace / Offset (+1 s) / Cancel }` modal

## Step 6 — Copy to other Storyboard

Overflow menu → `Copy to other storyboard`. Quick-pick of sibling
Storyboards on this plot appears; pick the destination.

Expected:
- New Scene on the destination with a deep-copied thumbnail ref
  (DIFFERENT from source per FR-MODULE-015)
- **Two** LogPanel cards linked by a shared `pairActivityId`:
  - `copy scene to Storyboard "Alt Narrative"` (source side, op:
    `copy-out`)
  - `copy scene to Storyboard "Alt Narrative"` (destination side,
    op: `copy-in`)

## Step 7 — Stale thumbnail detection + refresh

Reopen the plot after the underlying tracks have been edited
(deleted / renamed via another flow). On plot open, the stale-
detection pass runs (review 11A: early-return on zero-storyboard
plots; otherwise composes `readSceneWithStaleness` +
`computeFeatureSetHash`, T069).

Expected:
- Scenes whose `visible_feature_ids` no longer fully resolve render
  with a `StaleBadge` (⚠ STALE + tooltip naming the unresolved IDs)
- Click the Refresh button on the badge → re-capture via #174;
  thumbnail + hash + provenance update; stale flag clears
- Storyboard-header overflow → `Refresh all stale thumbnails`:
  iterates every stale Scene on the active Storyboard, emits one
  `refresh-thumbnail` card per Scene + one `refresh-all-stale`
  rollup card with `{ succeeded, failed }` tallies
- #174 failures leave the Scene byte-identical (SC-005)

## Step 8 — Missing-data routing from #217's hard-block

#217's playback hard-block modal offers `Open for editing`. Click it
for a Scene whose feature set no longer resolves.

Expected:
- Edit form opens with the `missing-data` panel populated:
  unresolved IDs listed + two remediation buttons (`Update to
  current` / `Delete`)
- `openSceneForMissingDataEdit` posts the `scene-edit-form-open`
  inbound message; the panel dispatcher opens the row

## Step 9 — Plot close → orphan-asset GC

Close the plot (or switch sessions).

Expected:
- `storyboardEditService.onPlotClosed` fires
- `sceneThumbnailService.gcOrphanAssets` scans `item.json` asset
  entries vs. live Scene `thumbnail_asset_ref` values, unlinks
  orphan PNGs, returns the list of reclaimed asset hrefs (telemetry
  only — no user toast per FR-EDIT-024 edge case)

## Expected LogPanel timeline

For a typical polish session, the LogPanel shows:

```
201400Z  copy-in   Scene X (pairActivityId=abc)
201400Z  copy-out  Scene Y (pairActivityId=abc)
201400Z  refresh-thumbnail  Scene Y
201400Z  refresh-thumbnail  Scene Z
201400Z  refresh-all-stale  { succeeded: 2, failed: 0 }
201400Z  update-to-current  Scene W
201400Z  duplicate  Scene W → 14:05:01Z
201400Z  restore    Scene Y (undo)
201400Z  delete     Scene Y
201400Z  describe   Scene X at 14:00:00Z
201400Z  rename     "201400Z APR 26" → "Exercise start — North channel"
```

With `debrief.logPanel.collapseConsecutiveSameOp = true` (default),
≥3 consecutive entries sharing (op, actor) within a 120 s window
collapse into a single card (the `refresh-thumbnail` batch above
would collapse if ≥3). Expand action reveals individual cards;
getTimeline output is byte-identical either way (SC-013).
