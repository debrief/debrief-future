# Playwright E2E Summary: Platform Chip (#186)

## Spec file

`shared/components/e2e/FilterBar.platform.spec.ts` — 10 tests, all passing.

## Results

| Test | Maps to | Status |
|------|---------|--------|
| renders in light theme (E7) | Storybook E2E section of plan.md | ✅ pass |
| renders in dark theme (E7) | Storybook E2E section of plan.md | ✅ pass |
| renders in vscode theme (E7) | Storybook E2E section of plan.md | ✅ pass |
| E1 add a platform chip via the UI | Story 1 | ✅ pass |
| E2 edit opens the compound editor | Story 2 scenario 1 | ✅ pass |
| E3 toggle negate shows NOT | Story 2 scenario 2 | ✅ pass |
| E4 confirm disabled when no attribute selected | Story 2 scenario 3 | ✅ pass |
| E5 remove platform chip | Story 2 scenario 4 | ✅ pass |
| E6 two platform chips inside OR container | Story 3 scenario 4 | ✅ pass |
| interaction keyframes (evidence capture) | Story 1 (visual flow) | ✅ pass |

**Total**: 10/10 passed in ~11s on `@sparticuz/chromium` via the bundled runner.

## Screenshot artifacts

Captured in `evidence/screenshots/`:

- `component-light.png` / `component-dark.png` / `component-vscode.png` — three theme variants of the "With Platform Chip" story. Each file is distinct (verified by md5).
- `interaction-1-empty.png` — empty filter bar baseline.
- `interaction-2-menu.png` — filter-type dropdown open with "Platform" available.
- `interaction-3-editor.png` — `PlatformValueEditor` popover with nationality + domain selected; Confirm enabled.
- `interaction-4-chip.png` — confirmed chip rendered in the bar (label "Platform: DE · Subsurface", anchor icon, tinted background).

## How to run

From the repo root:

```sh
# Cloud sessions (Claude Code)
cd apps/web-shell && node run-playwright.mjs   # extracts sparticuz chromium to /tmp/chromium
# OR, if chromium is already extracted:
cd shared/components && CLAUDE_CODE=1 pnpm exec playwright test FilterBar.platform

# Local macOS/Windows
pnpm exec playwright install chromium
pnpm --filter @debrief/components test:e2e FilterBar.platform
```

Requires a running Storybook on `localhost:6006` (`pnpm --filter @debrief/components exec storybook dev -p 6006 --no-open --ci`).

## Regression

No pre-existing E2E spec was modified by #186. The `FilterBar.spec.ts` suite continues to exercise the simple-chip flows unchanged; all pre-existing chip-type `data-testid` values are preserved (the `shape` narrowing is additive).

## Notes

- The three theme screenshots use an imperative CSS override (injected stylesheet) to force the Storybook iframe body/root background to match the requested theme, because Storybook's `globals=theme:<name>` URL parameter does not always re-trigger the `ThemeProvider` decorator before the first paint. The chip itself (and its CSS variables) pick up the theme via `data-theme` on `<html>` the way the ThemeProvider does at runtime.
- No animated GIF — the cloud environment has no `ffmpeg`/`convert`. Four sequential PNG keyframes cover the same narrative (empty → menu → editor → chip).
