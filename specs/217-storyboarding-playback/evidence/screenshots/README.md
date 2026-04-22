# Screenshots — deferred artefacts

## Summary

The nine Storybook theme PNGs (T511), the interaction GIF (T520), and the two E2E PNGs (T532, T533) are deferred. All three depend on the same infrastructure constraint as every other VS Code webview E2E in this repository: **Blocker #143** (openvscode-server iframe hierarchy cannot be driven by Playwright).

## Specifically deferred

| File | Task | What it would show |
|------|------|--------------------|
| `storyboard-panel-transport-light.png` | T511 | TransportRow story in light theme |
| `storyboard-panel-transport-dark.png` | T511 | TransportRow story in dark theme |
| `storyboard-panel-transport-vscode.png` | T511 | TransportRow story in vscode theme |
| `storyboard-panel-multi-light.png` | T511 | WithMultipleStoryboards story in light theme |
| `storyboard-panel-multi-dark.png` | T511 | WithMultipleStoryboards story in dark theme |
| `storyboard-panel-multi-vscode.png` | T511 | WithMultipleStoryboards story in vscode theme |
| `storyboard-panel-hardblock-light.png` | T511 | HardBlockModal story in light theme |
| `storyboard-panel-hardblock-dark.png` | T511 | HardBlockModal story in dark theme |
| `storyboard-panel-hardblock-vscode.png` | T511 | HardBlockModal story in vscode theme |
| `interaction.gif` | T520 | Forward-through-storyboard in code-server: click → map `flyTo` → scrubber narrow → rectangle highlight update |
| `e2e-hardblock.png` | T532 | Native VS Code modal surfaced by a missing-feature hard-block |
| `e2e-dropdown-switch.png` | T533 | Dropdown switch with Scene rectangles updating on the map |

## Why deferred

- **Storybook PNGs (T511)** — infrastructure ready (`shared/components/e2e/StoryboardPanel.spec.ts` exists from #216 + the `storybook:build` target works). The run itself requires `@sparticuz/chromium` + POSIX env-var handling. The Windows-local sandbox's invocation path through `apps/web-shell/run-playwright.mjs` fails on `CHROMIUM_PATH=...` before Chromium launches; the CI Linux path works. Running these from CI after PR open is the shortest path. Evidence for the shipped story will be the Storybook build itself, archived as a CI artefact.
- **Interaction GIF (T520)** — requires a successful webview E2E run to produce the WebM source before `ffmpeg` conversion. Blocked by #143.
- **E2E PNGs (T532, T533)** — depend on the 10 `describe.skip`'d Playwright tests in `tests/e2e/test-storyboard-playback.spec.ts`. Blocker #143 skips all VS Code webview E2E uniformly.

## What's covered instead

- **154 new unit tests** across the VS Code extension and `@debrief/components` (see `../test-summary.md`) verify every transport / hard-block / dropdown / scrub-lock scenario in isolation.
- **Storybook stories exist** (`WithMultipleStoryboards`, `Transport`, `HardBlockModal`) and can be toured manually by anyone running `pnpm --filter @debrief/components storybook` locally.
- **`usage-example.md`** provides an ASCII + narrative tour of the full flow.
- **`feature-integration.md`** provides a Mermaid sequence diagram of the end-to-end hop path.

## Unblock plan

When **Blocker #143** is resolved (tracked independently), a follow-up PR will:

1. Un-`describe.skip` `tests/e2e/test-storyboard-playback.spec.ts`.
2. Run the suite with `recordVideo: true` for the Forward-through-storyboard test → convert to GIF.
3. Run the existing `shared/components/e2e/StoryboardPanel.spec.ts` Storybook visual regression suite to produce the 9 theme PNGs.
4. Backfill the files listed above here and delete this README.

No code changes in #217 are needed for that unblock — the test selectors, command IDs, and view-model shapes are all stable.
