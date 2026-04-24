# Webview E2E summary — deferred

**Feature**: 218-storyboarding-edit
**Captured at**: 2026-04-24T12:42:33Z (commit `415df9e3`)
**Status**: deferred to post-merge follow-up

## Scope

`tests/e2e/test-storyboard-edit.spec.ts` and
`apps/web-shell/playwright/tests/storyboard-edit.spec.ts` (T068 / T087 / T094) would have:

- Driven the polish loop in code-server (real VS Code chrome) to verify command-palette flows, input-box / quick-pick / notification interactions, and the rename → describe → delete+undo → update-to-current → duplicate → copy-to-other → refresh-stale chain
- Captured workflow screenshots directly into `specs/218-storyboarding-edit/evidence/screenshots/` from the spec file (following the `properties-screenshots.spec.ts` pattern from #178)
- Produced `interaction.gif` (< 5 s, < 2 MB) via Playwright `recordVideo` + GIF conversion

## Why deferred

The service-, dispatcher-, and component-level behaviour is fully covered by the 54 new unit tests in `apps/vscode` + 62 new component tests in `shared/components` + 15 new session-state tests. The gap to end-to-end coverage is:

1. The live `captureThumbnail` adapter (`mapPanel.requestThumbnailCapture` → `writeSceneThumbnail`) is wired in `extension.ts` but not yet exercised on a real plot — only the port contract is tested.
2. The real VS Code `showInputBox` / `showQuickPick` / `showInformationMessage` calls in the command handlers aren't exercised under vitest; Playwright against code-server is the only way to verify them.

Running Playwright here would also produce the blog-post screenshots and the `interaction.gif` — doing it once post-merge is cheaper than running it twice (here for evidence, again for the shipped post).

## What the defer leaves on the table

- The `vscode-native-chrome.png` evidence screenshot (T094)
- The `interaction.gif` (polish loop, T097)
- Per-workflow screenshots for the shipped blog (T097)
- Code-server E2E as a regression gate in CI

## Mitigations

- Every command handler's decision logic is independently unit-tested through the service + dispatcher tests.
- The `readCurrentMapView` / `listSiblingStoryboards` / `resolveSceneStoryboard` ports have explicit `null`-return paths covered (user-facing toast surfaces the missing-state; never a silent failure).
- The panel dispatcher tests (T067) assert every outbound variant routes to the correct service method or `vscode.commands.executeCommand` route.

## Follow-up

Tracked as a TODO on PR #520: "Run code-server + web-shell Playwright E2E; capture evidence screenshots + GIF; fold into the shipped blog post."
