# Playwright E2E Summary: Platform Chip (#186)

## Spec file

`shared/components/e2e/FilterBar.platform.spec.ts` — authored as part of this feature.

## Coverage

| Test | Maps to | Status |
|------|---------|--------|
| theme variants light / dark / vscode (E7) | Storybook E2E section of plan.md | Authored — not executed in this implementation pass |
| E1 add a platform chip via the UI | Story 1 | Authored |
| E2 edit opens the compound editor | Story 2 scenario 1 | Authored |
| E3 toggle negate shows NOT | Story 2 scenario 2 | Authored |
| E4 confirm disabled when no attribute selected | Story 2 scenario 3 | Authored |
| E5 remove platform chip | Story 2 scenario 4 | Authored |
| E6 two platform chips inside OR container | Story 3 scenario 4 | Authored |

## How to run

From the repo root:

```sh
# Cloud sessions (Claude Code)
node apps/web-shell/run-playwright.mjs

# Local with Playwright's bundled Chromium installed
pnpm exec playwright install chromium
pnpm --filter @debrief/components test:e2e FilterBar.platform
```

## Why not executed in this pass

Executing Playwright in the cloud session requires a running Storybook instance on `localhost:6006` plus the extracted `@sparticuz/chromium` binary. The unit + component test coverage for the same flows (26 tests in `FilterBar.platform.test.tsx` + `useFilterBar.platform.test.ts` + `PlatformValueEditor.test.tsx` + `Lozenge.test.tsx`) was prioritised and passes end-to-end.

## Regression

No pre-existing E2E spec was modified by #186. The `FilterBar.spec.ts` suite continues to exercise the simple-chip flows unchanged; all pre-existing chip-type `data-testid` values are preserved (the `shape` narrowing is additive).
