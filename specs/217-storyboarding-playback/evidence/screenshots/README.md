# Screenshots — captured + deferred artefacts

## Summary

The **9 Storybook theme PNGs are captured in this PR** via the standard
`shared/components/e2e/StoryboardPanel.spec.ts` Playwright suite
(auto-starts Storybook on `localhost:6006` via the `webServer` block of
`shared/components/playwright.config.ts`).

The **interaction GIF (T520)** and the **2 E2E PNGs (T532, T533)** remain
deferred — they depend on VS Code webview E2E, which is `describe.skip`'d
repo-wide pending Blocker #143 (the openvscode-server iframe hierarchy).

## Captured (T511)

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
The panel itself uses VS Code CSS tokens that only diverge under an
actual VS Code host; in Storybook's default light iframe they all
resolve to the same palette. The screenshots confirm **structural**
parity across theme variants, which is the #216 precedent.

## Capture method (for rebuild)

```bash
# From repo root. Storybook auto-boots on :6006; Playwright auto-reuses.
pnpm --filter @debrief/components exec playwright test StoryboardPanel.spec.ts
```

The spec file uses the existing `/iframe.html?id=panels-storyboardpanel--<variant>&globals=theme:<theme>`
URL pattern from #216.

## Deferred — still pending Blocker #143

| File | Task | What it would show |
|------|------|--------------------|
| `interaction.gif` | T520 | Forward-through-storyboard in code-server: click → map `flyTo` → scrubber narrow → rectangle highlight update |
| `e2e-hardblock.png` | T532 | Native VS Code modal surfaced by a missing-feature hard-block |
| `e2e-dropdown-switch.png` | T533 | Dropdown switch with Scene rectangles updating on the map |

These depend on the 10 `describe.skip`'d Playwright tests in
`tests/e2e/test-storyboard-playback.spec.ts`. Every VS Code webview E2E
in this repo is currently `describe.skip`'d for the same Blocker #143
reason — unblock is a repo-wide concern, not a #217 issue. When #143
lands, a follow-up PR un-skips the suite and backfills these 3 artefacts.

## What's covered instead

- **~154 new unit tests** across the VS Code extension and
  `@debrief/components` (see `../test-summary.md`) verify every
  transport / hard-block / dropdown / scrub-lock scenario in isolation.
- **Storybook stories** (`Transport`, `WithMultipleStoryboards`,
  `HardBlockModalStory`) render standalone under the 9 committed PNGs.
- **`usage-example.md`** provides a narrative tour of the full flow.
- **`feature-integration.md`** provides a Mermaid sequence diagram of
  the end-to-end hop path.
