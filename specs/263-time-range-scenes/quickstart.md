# Quickstart: Capture and Play a Time-Range Scene

**Feature**: #263

## Prerequisites

- A working dev environment for `debrief-future` (`uv sync`, `pnpm install`, `task verify` green on a recent main).
- A sample plot containing at least one moving track over a window long enough to be visibly interesting (the existing `preview/workspace/samples/local-store/` fixtures qualify).
- A v2-or-newer Storyboard already attached to the plot (instant Scenes are fine; the demo Storyboard from #259's evidence works).

## Capture (forward path)

1. Open the sample plot in VS Code with the extension running, or in the web-shell.
2. Open the Storyboard panel for the plot.
3. Position the time slider at the start of the window of interest.
4. Frame the map (zoom and pan to the area you want the audience to see at the start).
5. Toggle the **range** affordance on the capture control. The control's appearance changes to indicate range mode.
6. Click **Capture**. The panel's banner appears: "Range in progress — scrub time and re-frame, then confirm".
7. Scrub the time slider forward to the end of the window (verify the tracks have visibly moved on the map).
8. Re-frame the map (pan / zoom to follow the action — or leave the same framing if you want a pure time scrub).
9. Click **Confirm**. A new Scene appears in the Storyboard list with a small range badge distinguishing it from instant Scenes.

To cancel mid-flow, click **Cancel** in the banner (or toggle range off). The in-progress capture is discarded; no Scene is written.

## Play forward

1. Select the new time-range Scene in the panel (or step to it via the transport).
2. Click **Play**. The engine begins the synchronised scrub:
   - The map viewport pans/zooms smoothly from your start framing toward your end framing.
   - The time slider crawls in step from `t_start` to `t_end`.
   - Tracks visibly advance; chart cursors move; any time-driven layer updates.
3. At the end the engine rests on the end frame and end time.

## Play reverse

1. With the engine resting at the end of the time-range Scene, click **Reverse** in the transport.
2. The engine runs the same scrub backwards: viewport from end → start, slider from `t_end` → `t_start`, in lock-step.
3. At the end of the reverse pass the engine rests on the start frame and start time and is ready to step back into the previous Scene.

## Interrupting a scrub

While a time-range Scene is playing:

- **Grab the slider** to take direct control — the scrub aborts at the current frame and your manual slider position takes over.
- **Click another Scene** in the panel — the scrub aborts and the engine transitions to your selection.
- **Press Pause / Stop** — the scrub aborts and the engine parks at the current frame.

In all cases the slider and viewport stay in sync at the moment of interrupt; you never see a half-finished scrub continue against your wishes.

## Common mistakes and what you'll see

| Mistake | What happens |
|---------|---------------|
| Confirm a range with `t_end <= t_start` (e.g. scrubbed backwards before confirming) | The capture is rejected with an explicit error naming `time_range.start` and `time_range.end`; no Scene is written; you can adjust the slider and retry, or cancel. |
| Try to load a hand-edited plot where a Scene has `viewport_end` set but `time_range` is null (or vice versa) | The plot fails to load with `SceneFlavourXorViolation` naming both fields. |
| Try to load a hand-edited plot where a time-range Scene's `timestamp` doesn't match `time_range.start` | The plot fails to load with `SceneTimestampDoesNotEqualTimeRangeStartError`. |

## Running the relevant tests

```sh
# Schema adherence (Article II)
uv run pytest shared/schemas/tests/test_storyboard_scene_flavour.py

# CRUD + validate + types
pnpm --filter @debrief/components test storyboard

# Playback engine
pnpm --filter @debrief/vscode-extension test storyboardPlayback.timeRange

# Capture command
pnpm --filter @debrief/vscode-extension test captureScene.range

# Storybook E2E (range affordance UI)
cd shared/components && node run-playwright.mjs StoryboardPanel-range

# Web-shell workflow (end-to-end capture + playback)
cd apps/web-shell && node run-playwright.mjs storyboard-range-scene
```

## Evidence capture for the blog post

The Playwright web-shell test writes screenshots directly into `specs/263-time-range-scenes/evidence/screenshots/`. Expected artefacts:

- `01-range-armed.png` — the affordance toggled on, capture button styled for range mode.
- `02-range-in-progress.png` — banner visible after first capture action.
- `03-time-range-scene-resting.png` — Storyboard list with the new Scene + range badge.
- `04-mid-scrub.png` — frame captured at p≈0.5 during forward playback.
- `05-reverse-mid-scrub.png` — symmetric frame at p≈0.5 during reverse playback.

An optional interaction GIF (`range-capture-and-play.gif`) bundles steps 5–9 of the capture flow plus a forward play for the post hero.
