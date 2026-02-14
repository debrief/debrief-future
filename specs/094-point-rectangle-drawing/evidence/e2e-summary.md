# E2E Test Summary: Point & Rectangle Drawing (Feature 094)

## Full Suite Results

**Runner**: Playwright (Chromium via @sparticuz/chromium)
**Date**: 2026-02-13
**Duration**: 38.6s (serial execution, 1 worker)
**Result**: 25/25 passed (0 failures)

### Drawing Tests (13/13)

| Test | Duration | Status |
|------|----------|--------|
| Rendering: renders map and empty feature list | 1.3s | Passed |
| Rendering: map container is visible | 1.2s | Passed |
| Rendering: toolbar is visible with draw trigger | 1.2s | Passed |
| Theme: renders in light theme | 1.2s | Passed |
| Theme: renders in dark theme | 1.2s | Passed |
| Theme: renders in vscode theme | 1.2s | Passed |
| Point: clicking draw trigger opens shape palette | 1.2s | Passed |
| Point: selecting point mode activates drawing | 1.3s | Passed |
| Point: clicking map creates a point feature | 2.3s | Passed |
| Rectangle: selecting rectangle mode activates drawing | 1.3s | Passed |
| Rectangle: two-corner click creates a rectangle feature | 2.7s | Passed |
| Screenshot: capture default state | 1.8s | Passed |
| Screenshot: capture theme variants | 3.9s | Passed |

### ToolMatchHarness Tests (12/12) — No Regressions

| Test | Duration | Status |
|------|----------|--------|
| Initial State: Global Statistics active | 1.4s | Passed |
| Initial State: 0 selected count | 915ms | Passed |
| Selection: 2 tracks activates Range Calc | 1.1s | Passed |
| Selection: track + point activates Bearing | 1.1s | Passed |
| Selection: deselect returns to initial | 1.0s | Passed |
| Toggle: show inactive reveals tools | 1.1s | Passed |
| Toggle: hide inactive hides tools | 1.0s | Passed |
| Variants: TwoTracksSelected | 1.0s | Passed |
| Variants: TrackAndPoint | 1.0s | Passed |
| Screenshot: empty selection | 1.3s | Passed |
| Screenshot: two tracks | 1.3s | Passed |
| Screenshot: show inactive | 1.3s | Passed |

## Theme Variant Screenshots

Screenshots captured to `evidence/screenshots/`:
- `drawing-default.png` — default theme
- `drawing-light.png` — light theme
- `drawing-dark.png` — dark theme
- `drawing-vscode.png` — VS Code theme

## Storybook Screenshots

- `storybook-screenshot-point.png` — point drawn on map with feature list
- `storybook-screenshot-rectangle.png` — point + rectangle drawn on map with feature list
