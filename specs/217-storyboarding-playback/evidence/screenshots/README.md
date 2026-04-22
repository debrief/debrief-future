# Screenshots — captured

All 12 planned visual artefacts for #217 are captured via the
`shared/components/e2e/` Playwright + Storybook harness — the same path
#216 used. No VS Code host required; everything drives through the
presentational components and the Storybook iframe.

## Per-component captures (9 PNGs, T511)

Per-story × per-theme captures from the #216-style
`StoryboardPanel.spec.ts` harness.

| File | Story | Theme |
|------|-------|-------|
| `storyboard-panel-transport-light.png` | `Transport` | light |
| `storyboard-panel-transport-dark.png` | `Transport` | dark |
| `storyboard-panel-transport-vscode.png` | `Transport` | vscode |
| `storyboard-panel-multi-light.png` | `WithMultipleStoryboards` | light |
| `storyboard-panel-multi-dark.png` | `WithMultipleStoryboards` | dark |
| `storyboard-panel-multi-vscode.png` | `WithMultipleStoryboards` | vscode |
| `storyboard-panel-hardblock-light.png` | `HardBlockModalStory` | light |
| `storyboard-panel-hardblock-dark.png` | `HardBlockModalStory` | dark |
| `storyboard-panel-hardblock-vscode.png` | `HardBlockModalStory` | vscode |

**Note on theme parity**: the three theme variants produce visually
identical PNGs for the Storyboard panel — matching #216's behaviour
(`panel-three-scenes-{light,dark,vscode}.png` are also byte-identical).
The panel uses VS Code CSS tokens that only diverge under an actual
VS Code host; in Storybook's default light iframe they all resolve to
the same palette. The screenshots confirm **structural** parity across
theme variants, which is the #216 precedent.

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
| `interaction.gif` | `StoryboardPlayback.spec.ts` — `records forward-through-storyboard flow` (Playwright `recordVideo` → `ffmpeg` WebM→GIF) |

The integrated story uses two Storyboards (Commander's view with 3
Scenes where the 3rd is `blocked`; ASW evidence with 3 Scenes) so that
a single harness covers dropdown switch, forward-through, and
hard-block in one place.

**Map tile note**: the Storybook sandbox cannot fetch OpenStreetMap
tiles reliably, so captured images sometimes show a blank tile layer.
The Scene rectangle polygons, the panel state, and the modal / active-
row-highlight visibility are unaffected — those are the invariants
these captures exist to demonstrate.

## Capture method (for rebuild)

```bash
# Boot Storybook once (reused across tests via webServer.reuseExistingServer)
pnpm --filter @debrief/components storybook &

# Run the component-level spec (9 theme PNGs + #216 regressions)
pnpm --filter @debrief/components exec playwright test StoryboardPanel.spec.ts

# Run the integrated-flow spec (e2e PNGs + WebM recording)
pnpm --filter @debrief/components exec playwright test StoryboardPlayback.spec.ts

# Convert WebM → GIF (requires ffmpeg; @ffmpeg-installer/ffmpeg works cross-platform)
ffmpeg -y -ss 11 -t 5 \
  -i shared/components/test-results/.../5dd85d18de5973ee6d5c6d6c9c028465.webm \
  -vf "fps=12,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer" \
  specs/217-storyboarding-playback/evidence/screenshots/interaction.gif
```

The WebM skip offset (`-ss 11`) is the empirical Storybook-boot-delay
for a fresh browser context; the first ~11 seconds of the recording
are the Storybook preview loading spinner. The meaningful 5-second
interaction window starts after the harness selector resolves.

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
