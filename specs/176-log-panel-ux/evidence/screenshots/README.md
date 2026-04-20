# LogPanel Rich Card Screenshots

All five screenshots in this directory are captured automatically by
`shared/components/e2e/LogPanel.spec.ts` and ship in-repo so they can be
embedded in the blog post and the PR body without reproducing the
Storybook build.

## How to Re-capture

```sh
# 1. Build Storybook (one-time per change)
pnpm --filter @debrief/components build-storybook

# 2. Serve the static build on :6006 and run the Playwright spec
cd shared/components
npx http-server storybook-static -p 6006 --silent &
CLAUDE_CODE=1 pnpm exec playwright test e2e/LogPanel.spec.ts
```

Local (non-cloud) dev can skip the manual serve — `playwright.config.ts`
auto-starts `storybook dev` on :6006 when `CLAUDE_CODE` is not set.

## Files

| File | Story | Contents |
|------|-------|----------|
| `component-light.png` | `LogPanel — Timeline Default` | The default analyst view: five cards with category icons, track badges, UTC timestamps, single-decimal durations, and parameter chips with non-default markers. |
| `component-vscode.png` | `LogPanel — Timeline Default` | Same story under the `vscode` theme globals URL param. |
| `all-categories.png` | `LogPanel — Rich Card: All Categories` | One card per tool-category icon — import, style, calc, filter, snapshot, plus the neutral-grey fallback. |
| `edge-cases.png` | `LogPanel — Rich Card: Edge Cases` | The `Manual checkpoint` and `No parameters` placeholders, missing-duration fallback, and multi-track wrap behaviour. |
| `disabled-state.png` | `LogPanel — Rich Card: Disabled` | A disabled card at 50% opacity with its red-tinted `Disabled` badge. |

The dark-theme variant and the interaction GIF are follow-up artefacts
(tracked via `#209` LogPanel axe-core audit and the manual demo capture
step). They are not produced automatically by the Playwright spec.
