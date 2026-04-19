# LogPanel Rich Card Screenshots

## How to Capture

Run the Playwright component E2E that ships with this feature. It
writes all required screenshots to this directory:

```sh
# Cloud / Claude Code sessions
CLAUDE_CODE=1 pnpm --filter @debrief/components test:e2e LogPanel.spec.ts

# Local dev — standard Playwright auto-starts Storybook on :6006
pnpm --filter @debrief/components test:e2e LogPanel.spec.ts
```

## Files Produced

| File | Story | Theme |
|------|-------|-------|
| `component-light.png` | `LogPanel — Timeline Default` | `light` |
| `component-vscode.png` | `LogPanel — Timeline Default` | `vscode` |
| `edge-cases.png` | `LogPanel — Rich Card Edge Cases` | `light` |
| `disabled-state.png` | `LogPanel — Rich Card Disabled` | `light` |

The dark-theme variant and the interaction GIF are follow-up artefacts
(tracked via `#209` LogPanel axe-core audit and the manual demo capture
step). They are not produced automatically by the Playwright spec.
