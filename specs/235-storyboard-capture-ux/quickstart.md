# Quickstart — Storyboard Capture & Maintenance (Web-Shell + VS Code)

**Feature**: 235-storyboard-capture-ux
**Audience**: Analyst exercising the new flow during /speckit.implement /
hands-on review.
**Prerequisites**: A plot with at least a few hundred position reports
loaded into either host. A clean session is fine — the flow creates
the first Storyboard for you.

This walkthrough is the same on both hosts. Where they differ, the
divergence is called out inline.

---

## 1. Capture your first Scene

1. Open the plot. The Storyboard side rail is visible on the right.
   Its empty state shows: "No storyboards yet — Capture Scene to start
   one."
2. Frame the map (pan + zoom). Position the time playhead at the
   moment you want to remember. Toggle visibility of any tracks you
   don't want in the Scene's `visible_feature_ids`.
3. Confirm the map and the time controller are both fully visible —
   they will stay that way throughout this flow.
4. Click **Capture Scene** (or press `Ctrl/Cmd+Alt+C` — VS Code
   requires the Map Viewer to have focus; web-shell only requires
   that no input field has focus).
5. The rail expands a single new row: an inline naming form. The name
   field is pre-filled with `"<plot name> — storyboard"` and is
   already focused. **The map and time controller remain
   uncovered.** You can still pan / zoom / drag the time playhead
   while the naming row is open.
6. Adjust the name if you'd like. Press `Enter` (or click Confirm).
7. The rail shows a new Scene row with a thumbnail, the DTG-format
   default title (e.g. `281030Z APR 26`), and a faint "captured"
   pulse. The plot is dirty — save with the host's normal save
   shortcut to make it durable.

**What just happened on disk** (only visible after save): one
`StoryboardFeature` and one `SceneFeature` were appended to the
plot's FeatureCollection via #215's CRUD module. A thumbnail PNG was
written into the plot's STAC asset directory by #174. A `LogEntry`
with `was_generated_by.parameters.op = "create"` was appended to each
Feature's `provenance[]`.

---

## 2. Capture more Scenes

1. Re-frame the map and move the time playhead to a different moment.
2. Press `Ctrl/Cmd+Alt+C` (or click Capture Scene).
3. **No naming row appears** — subsequent captures append to the
   active Storyboard. The new Scene row appears in the rail in
   `timestamp`-ascending order.

---

## 3. Resolve a duplicate-timestamp collision

1. Move the time playhead onto an instant where a Scene already
   exists (the rail row's DTG matches the current time controller
   value).
2. Click Capture Scene.
3. An **inline collision banner** appears anchored above the
   conflicting Scene row in the rail: "A scene already exists at
   281030Z APR 26 — Replace / Offset (+1 s) / Cancel." The map and
   time controller remain operable.
4. Pick the resolution that matches your intent:
   - **Replace** — overwrites the conflicting Scene with the
     current map state, preserving its row position.
   - **Offset (+1 s)** — adds one second to the new capture's
     timestamp and retries. If the new timestamp also collides
     (rare unless the analyst is power-pressing), the banner stays
     open and the offset count goes up. The button hides at the
     60-second cap and the rail prompts you to move the time
     playhead and try again.
   - **Cancel** — abandons the capture; nothing is written.

---

## 4. Maintain captured Scenes

Every maintenance op happens inside the Scene's row. The map and
time controller stay uncovered for all of them.

| Op | How | Notes |
|----|-----|-------|
| Rename | Click the row; the title becomes inline-editable. Press Enter to save. | Edits the Scene title only — `timestamp`, `viewport`, `visible_feature_ids` are unchanged. |
| Edit description (markdown) | Expand the row's overflow menu → "Edit description". An inline markdown editor opens within the row. | Description is rendered in playback. |
| Delete (with undo) | Overflow menu → Delete. The row collapses; an in-rail toast offers Undo for ~5 seconds. | The Scene is hard-deleted via #215's CRUD; Undo restores it within the toast window. |
| Update to current | Per-row button "Update to current". | Replaces `viewport`, `timestamp`, `visible_feature_ids`, `feature_set_hash`, and `thumbnail_asset_ref` with the live state. The only sanctioned way to change a Scene's `timestamp` after creation. |
| Duplicate | Overflow menu → Duplicate. You'll be prompted (inline) for a new timestamp. | Useful for "two Scenes that share the same map framing but at different times." |
| Copy to other Storyboard | Overflow menu → Copy to Storyboard → pick the destination from the inline list. | Deep-copies the thumbnail asset (per #215). |
| Refresh stale thumbnail | A row with a stale-feature-set badge offers an in-row refresh button. | Re-runs #174 against the live state for that Scene's `viewport` + `timestamp`. |

**Rule that applies to all of these**: a Scene's `timestamp` is its
temporal viewport. **There is no "edit timestamp" affordance and no
drag handle to reorder Scenes.** To put a Scene at a different time,
delete the misplaced one and capture a new one. (This was an
explicit clarification — see [Clarifications § 2026-04-28](./spec.md#clarifications).)

---

## 5. Manage multiple Storyboards on the same plot

1. The rail header shows the active Storyboard's name as a
   dropdown.
2. Open the dropdown to switch to a different Storyboard, or to pick
   "Create new…" — that opens a fresh inline naming row identical to
   the first-capture flow.
3. Use the header overflow menu for Rename or Delete.
4. Delete shows an inline cascade preview ("3 Scenes will also be
   deleted") before persisting; an in-rail toast offers Undo within
   the undo window.

When you switch Storyboards, the on-map Scene rectangles re-render
for the new active Storyboard (per #217); the previous Storyboard's
rectangles disappear.

---

## 6. The visibility invariant — what to verify by hand

Before signing off the feature, run these manual checks against both
hosts. They mirror what the Playwright invariant suite does
automatically:

- During the inline naming row, drag the map. The map responds.
- During the inline naming row, scroll the time controller. The
  playhead moves.
- During the collision banner, the map and the time controller still
  respond to pointer and keyboard input.
- During any in-row edit (rename, description, delete-undo toast,
  cascade-delete confirm), the map and time controller still
  respond.
- At no point in any flow does any modal, dialog, popover, or scrim
  appear on top of the map or time controller.

If any of those fail, the relevant Playwright test would have failed
in CI; if you're seeing a regression locally, file the contradiction
against this spec, not against an implementation file.

---

## 7. Cross-host parity check

If you have both hosts available:

1. Save the plot in web-shell after capturing two Scenes and a
   couple of edits.
2. Open the same plot in VS Code.
3. The same two Scenes and edits appear identically. The rail looks
   the same. Every affordance is in the same place.

If they diverge visually beyond the host-chrome baseline (VS Code
title bar, panel border), file an SC-003 regression.
