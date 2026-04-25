# Quickstart: Verifying Theme Responsiveness

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-04-25

This quickstart walks through the manual verification path for the feature once implemented. It maps directly onto the spec's Independent Tests for User Stories 1–3 and gives you the smallest reproducible scenarios for each contract assertion.

The full automated coverage (Vitest + Playwright + Storybook visual snapshots) is described in `plan.md` under "Storybook E2E Testing" and "Web-Shell E2E Testing"; this file is for reviewers, demoers, and humans who want to satisfy themselves the fix actually works.

---

## Prerequisites

```sh
git checkout 220-fix-theme-responsiveness   # or claude/<...> with .specify/.active-feature set
pnpm install
pnpm --filter @debrief/components build
```

You'll need three environments handy:

1. **Storybook**: `pnpm --filter @debrief/components storybook` → http://localhost:6006
2. **Web-shell**: `pnpm --filter @debrief/web-shell dev` → http://localhost:5173
3. **VS Code with the extension loaded**: `code apps/vscode` then F5 to launch the Extension Development Host

---

## Verification 1 — Storybook variant switcher (User Story 3)

**Goal**: prove that components in Storybook honour the four explicit variants and that no story falls through to the hardcoded dark fallback.

1. Open Storybook → http://localhost:6006.
2. Pick any LogPanel story (e.g. `Components / LogPanel / Default`).
3. In the Storybook toolbar, switch the theme through every option in turn:
   - **Light** → background should match VS Code Default Light+ (`#FFFFFF`-adjacent, light grey panel).
   - **Dark** → background matches VS Code Default Dark+ (`#1E1E1E`).
   - **High Contrast Light** → background nearly pure white, borders thick and black, focus rings prominent.
   - **High Contrast Dark** → background nearly pure black, borders white, focus rings yellow.
4. Repeat for `FilterBar`, `FeatureList`, and `MapView` stories.

**Pass criteria** (FR-001, FR-005, FR-011, SC-004, SC-009):
- No story shows a *darker* panel than the body in Light mode (the previous-bug signature).
- High Contrast variants are visibly distinct from regular dark/light — not just slightly darker.
- The `data-theme` attribute on `<html>` (DevTools Inspector) matches the toolbar selection.

---

## Verification 2 — Runtime switch in VS Code (User Story 1, P1)

**Goal**: prove a live VS Code theme change propagates to every open Debrief panel within one second.

1. Launch the Extension Development Host (`code apps/vscode` → F5).
2. Open every Debrief panel: Activity, Layers, Log, Map, Results, Storyboard, Time Controller, Catalog Overview.
3. With all panels visible, run the VS Code command `Preferences: Color Theme` (`Ctrl+K Ctrl+T`).
4. Switch from "Default Dark+" to "Default Light+". Time the transition with a stopwatch (or just feel it).
5. Switch from "Default Light+" to "Default High Contrast". Switch to "Default High Contrast Light". Switch back to "Default Dark+".

**Pass criteria** (FR-002, SC-001, SC-006, SC-008):
- Every panel updates within ~1s — no panel left rendering the previous palette.
- No white flash. No 200ms+ "stuck on the old colour" artefact.
- High-contrast switches show the heavier borders and distinct focus rings (the `isHighContrast` flag is doing its job).
- DevTools (Help → Toggle Developer Tools) on any webview shows `data-theme` matching the new theme.

---

## Verification 3 — Edge case: panel opened mid-load (Edge case "white flash")

**Goal**: prove a panel never paints its initial frame in the wrong variant.

1. Set VS Code to Default Dark+.
2. Close all Debrief panels.
3. Open the Log panel. Watch it appear.
4. Repeat steps 1–3 with Default Light+.
5. Repeat with Default High Contrast.

**Pass criteria** (Edge cases in spec.md):
- The first paint already shows the correct variant. No "flash of light theme then settle into dark" or vice versa.

---

## Verification 4 — Web-shell harness (the automated path)

**Goal**: confirm the runtime-switch test in `apps/web-shell` actually exercises the path FR-010 describes.

```sh
cd apps/web-shell
node run-playwright.mjs theme-runtime-switch
```

Inspect `apps/web-shell/playwright-report/index.html` after the run. You should see one screenshot per variant (four total) under `specs/220-fix-theme-responsiveness/evidence/screenshots/`.

**Pass criteria**:
- Test passes without flake on three consecutive runs.
- Screenshots show all four variants distinctly rendered for the LogPanel + MapView + FilterBar.

---

## Verification 5 — Type safety (Article XV)

**Goal**: confirm the legacy `'vscode'` variant is fully retired and no `any` leaks at the message boundary.

```sh
# 1. There must be zero references to the literal 'vscode' as a ThemeVariant value:
grep -RIn "variant: *['\"]vscode['\"]\\|as +ThemeVariant *= *['\"]vscode['\"]\\|'vscode'" \
  shared/components/src apps/vscode/src \
  --include='*.ts' --include='*.tsx'
# Expected: no results.

# 2. The flat union compiles without any:
pnpm -r typecheck

# 3. Lint passes (no any introduced at the message boundary):
pnpm lint
```

**Pass criteria** (Constitution Article XV):
- Grep returns no results.
- `pnpm -r typecheck` exits 0.
- `pnpm lint` exits 0.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Storybook still shows dark fallback in Light mode | `vscode-token-map.ts` not wired into the `withThemeProvider` decorator | Check `shared/components/.storybook/preview.tsx` imports and applies `VSCODE_TOKEN_MAP[variant]` |
| Panel updates only after a reload | Webview entry not wrapped in `ThemeProvider`, or `setupVSCodeThemeSync` not called | Check `apps/vscode/src/webview/web/_bootstrap.tsx` is imported by every entry |
| High contrast variants identical to regular dark/light | `isHighContrast` flag not consumed by the affected component, or token map values are wrong | Inspect the component's CSS for `[data-theme='high-contrast-dark']` blocks; compare against VS Code's "Default High Contrast" theme |
| Theme switch lags >1s | Extension-host relay not started, falling back to body-class observer only with debouncing | Confirm `startThemeRelay` is called from `extension.ts` activation |

---

## Reference

- **Spec FRs covered by these checks**: FR-001 (V1, V2, V3), FR-002 (V2, V4), FR-003 (V1), FR-004 (V1, V2), FR-005 (V1), FR-006 (V1, V2), FR-007 (architectural — every webview wraps once), FR-008 (V1, V2), FR-009 (V2 — every panel updates), FR-010 (V2, V4), FR-011 (V1, V4).
- **SCs covered**: SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-009. SC-005 (WCAG 2.1 AA contrast) is verified by the spec 209 axe-core audit, not this quickstart.
