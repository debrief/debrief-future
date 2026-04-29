## Hook

| | Before | After |
|---|---|---|
| **First-capture naming** | VS Code quick-pick at the top of the window, covering the time controller | Inline naming row inside the side rail; map and time controller stay put |
| **Duplicate-timestamp resolution** | Modal dialog (Replace / Offset / Cancel) covering the map | Inline banner above the affected Scene row; the analyst can still nudge the playhead while deciding |
| **Web-shell capture** | No path at all — the harness was fixture-only | Same flow as VS Code, against live session state, with a real thumbnail |
| **Where the analyst's eye goes** | Up to the prompt, away from what's being captured | Stays on the map and time controller — the controls that *define* the Scene |

## What We're Building

The Storyboarding epic shipped capture, playback, and the edit suite inside VS Code over the last few months (#216, #217, #218, #230). The web-shell got a fixture-driven harness for component development but no real authoring path — analysts running the browser-based shell could not produce a storyboard at all. This slice closes that gap and, in the same PR, redesigns the capture and maintenance UX on both hosts so the analyst never loses sight of the controls that define each Scene.

A Scene's whole content is its temporal viewport (where the playhead is) and its spatial viewport (what the map is showing). Both VS Code prompts the analyst hit during capture — the first-capture quick-pick and the duplicate-timestamp Replace/Offset/Cancel modal — sat directly over those controls. So at the most consequential moment, the analyst was looking at chrome rather than the thing they were freezing. The redesign moves both prompts inline into the Storyboard side rail, which lives in a column adjacent to the central area rather than overlapping it. The map and time controller stay continuously visible and continuously interactive, right up to the moment the Scene is confirmed. If the analyst nudges the playhead while the naming row is open, the captured Scene picks up the nudged value. The shared `StoryboardPanel` from `@debrief/components` is now mounted in both hosts; the new naming row and collision banner are interactive Storybook demos that ship with the post.

## How It Fits

Both hosts mount the same `StoryboardPanel` from `shared/components/`. Capture orchestration stays host-specific — `apps/vscode/src/commands/captureScene.ts` keeps its keybinding, `when`-clause, and command entry; `apps/web-shell/src/commands/captureSceneWeb.ts` is a new browser sibling — but every mutation funnels through the headless CRUD module from #215, so persistence is identical and a storyboard captured in one host opens unchanged in the other. Thumbnails route through #174's existing pipeline, with a new browser adaptor (`webSceneThumbnailAdapter.ts`) that emits the same result shape VS Code's adaptor already returns. There are no schema changes, no new persisted entities, and no new services — this slice is integration and UX redesign sitting on top of the storyboarding plumbing that's been accumulating since #215.

## Key Decisions

- **The legacy VS Code quick-pick and Replace/Offset/Cancel modal are removed in the same PR**, not staged behind a feature flag. Running two flows side-by-side would mean two visual languages for the same operation, and analysts switching between hosts would re-learn the prompt every time. The injection seam in `captureScene.ts` was put there in #216 anticipating exactly this swap.

- **A Scene's `timestamp` is immutable.** The rail exposes no drag-to-reorder handle and no edit-timestamp affordance. The timestamp *is* the temporal viewport — editing it would not preserve the same Scene at a different position, it would produce a different Scene. To change the order, the analyst deletes the misplaced Scene and captures a new one at the desired moment. `update-to-current` re-anchors the entire Scene to live state and is the only sanctioned path by which a timestamp changes after creation.

- **Web-shell ships full edit-suite parity with VS Code in this slice.** Rename, describe, delete + undo, update-to-current, duplicate, copy-to-other-storyboard, refresh-stale-thumbnail — every Scene-level op from #218 and every Storyboard-level op from #217 lands in web-shell at the same time as the new UX. No "VS Code only" gaps to explain to analysts.

- **The two new inline rows live as state slices on the existing `useStoryboardEditReducer`.** Folding naming and collision into the same reducer that #230 introduced for the edit-row machine means both hosts share the same state-machine semantics for free, every transition has a unit test target identical in shape to the existing edit-row tests, and the visibility invariants become reducer-level testable — the reducer can never produce a state where any modal or overlay descriptor exists.

- **Visibility invariants are programmatically enforced by Playwright, not screenshot-diffed.** A helper walks the DOM at every step of every flow, asserting that the map and time controller are visible, pointer-reachable, and not intersected by any element with `role="dialog"`, `aria-modal="true"`, `[data-overlay]`, or fixed positioning above the rail's z-index. Pixel diffing alone is too brittle — themes shift pixels, but the invariant is structural.
