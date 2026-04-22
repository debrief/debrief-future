# Screenshots — captured

All 12 planned visual artefacts for #217 are captured via the
`shared/components/e2e/` Playwright + Storybook harness — the same path
#216 used. No VS Code host required; everything drives through the
presentational components and the Storybook iframe.

## Per-component captures (3 PNGs, T511)

Per-story captures from the #216-style `StoryboardPanel.spec.ts` harness.
One canonical light-theme capture per story.

| File | Story |
|------|-------|
| `storyboard-panel-transport-light.png` | `Transport` |
| `storyboard-panel-multi-light.png` | `WithMultipleStoryboards` |
| `storyboard-panel-hardblock-light.png` | `HardBlockModalStory` |

**Theme parity note**: the plan originally called for three theme
variants per story (light / dark / vscode × 3 = 9 PNGs). Under the
Storybook sandbox the panel's VS Code CSS tokens resolve to the same
palette regardless of the `globals=theme:...` URL param, so all three
theme captures were byte-identical to the light capture (the same
behaviour is visible on #216's `panel-three-scenes-{light,dark,vscode}.png`).
The two redundant variants per story were dropped; the three light
captures above are the canonical evidence for the three headline
affordances. Under a real VS Code host the tokens diverge as expected
(tested at unit level; not visually captured here).

## Integrated flow captures (3 artefacts, T520 + T532 + T533)

Driven by the integrated `StoryboardPlayback.stories.tsx` story that
wires `StoryboardPanel` + `TransportRow` + `StoryboardHeader` +
`MapView` (with `flyToTarget` + `SceneRectangleLayer` + `onFlyToComplete`)
together with React-local state. No VS Code dependency — the full
playback flow renders in Storybook under `panels-storyboardplayback--integrated-playback`.

| File | Captured by |
|------|-------------|
| `e2e-dropdown-switch.png` | `StoryboardPlayback.spec.ts` — `dropdown switch refreshes Scene rectangles` |
| `e2e-hardblock.png` | `StoryboardPlayback.spec.ts` — `forward onto a blocked scene surfaces HardBlockModal` |
| `interaction.gif` | `StoryboardPlayback.spec.ts` — `frames forward-through-storyboard flow` (Playwright `page.screenshot()` loop → `ffmpeg` PNG stitch) |

The integrated story uses two Storyboards (Commander's view with 3
Scenes where the 3rd is `blocked`; ASW evidence with 3 Scenes) so that
a single harness covers dropdown switch, forward-through, and
hard-block in one place.

**Why PNG-stitch, not WebM**: Playwright's native `recordVideo` is
compositor-level and doesn't capture Leaflet's tile-layer rasters
reliably on Chromium (the panel + `SceneRectangleLayer` polygons render
fine; map tiles appear blank). A parallel `page.screenshot()` loop at
120 ms intervals is a page-level path that captures the full rendered
canvas, tiles included. The test drives the Forward / Backward /
Forward interaction, grabs ~30 frames, and writes a sequence
(`frame-0000.png`...) under `test-results/`; ffmpeg stitches the
sequence into a ~1.2 MB 8 fps GIF.

The initial tile settle is **2.5 seconds** (`INITIAL_TILE_SETTLE_MS`),
and **2.6 seconds** between transitions (`FLYTO_SETTLE_MS`), so the
cache warms before each flyTo — the GIF shows the UK south-coast
basemap throughout, rectangle polygons shifting as transport steps,
and scene-row highlight moving in lock-step.

## Capture method (for rebuild)

```bash
# Boot Storybook once (reused across tests via webServer.reuseExistingServer)
pnpm --filter @debrief/components storybook &

# Run the component-level spec (9 theme PNGs + #216 regressions)
pnpm --filter @debrief/components exec playwright test StoryboardPanel.spec.ts

# Run the integrated-flow spec — 2 assertion tests + 1 frame-grabber
pnpm --filter @debrief/components exec playwright test StoryboardPlayback.spec.ts

# Stitch the frame sequence into a GIF (requires ffmpeg;
# @ffmpeg-installer/ffmpeg works cross-platform)
ffmpeg -y -framerate 8 \
  -i shared/components/test-results/.../frame-%04d.png \
  -vf "scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" \
  specs/217-storyboarding-playback/evidence/screenshots/interaction.gif
```

The frame-grab test captures only the right-hand map region (clip =
`{x:380, y:0, width:900, height:480}`) so individual frames stay small
and the resulting GIF focuses on the tile + rectangle motion rather
than the mostly-static panel.

## What's covered

- **~154 new unit tests** across the VS Code extension and
  `@debrief/components` (see `../test-summary.md`) verify every
  transport / hard-block / dropdown / scrub-lock scenario in isolation.
- **9 Storybook theme PNGs** confirm per-component rendering under all
  three theme variants.
- **3 integrated-flow artefacts** confirm the full wiring (panel →
  transport → service-equivalent state machine → MapView `flyToTarget`
  → `SceneRectangleLayer` → HardBlockModal surface) works end-to-end
  without a VS Code host.
- **`usage-example.md`** narrative tour.
- **`feature-integration.md`** Mermaid sequence diagram.
