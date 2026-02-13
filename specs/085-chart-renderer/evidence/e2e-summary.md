# E2E Test Summary

**Feature**: 085-chart-renderer
**Test Runner**: Playwright
**Test File**: `shared/components/e2e/ChartRenderer.spec.ts`

## Test Suites

| Suite | Tests | Theme Variants | Interactions |
|-------|-------|----------------|--------------|
| Bar Chart Rendering | 3 | light, dark, vscode | none |
| Line Chart Rendering | 3 | light, dark, vscode | none |
| Empty State | 1 | light | none |
| Error State | 1 | light | none |
| Tooltip Interaction | 1 | light | hover |
| **Total** | **9** | | |

## Test Details

### Bar Chart (3 tests)
- Renders in light theme with canvas element visible
- Renders in dark theme (adapts colours via CSS variables)
- Renders in VS Code theme (uses editor background/foreground)

### Line Chart (3 tests)
- Renders in light theme with canvas element visible
- Renders in dark theme
- Renders in VS Code theme

### Empty State (1 test)
- Displays "No render spec provided" error message
- Chart container remains visible (no crash)

### Error State (1 test)
- Displays error message without crashing
- Container element stays in DOM

### Tooltip Interaction (1 test)
- Hovering over bar triggers Vega tooltip

## Screenshots Planned

- [ ] `screenshots/bar-chart-light.png`
- [ ] `screenshots/bar-chart-dark.png`
- [ ] `screenshots/bar-chart-vscode.png`
- [ ] `screenshots/line-chart-light.png`
- [ ] `screenshots/line-chart-dark.png`
- [ ] `screenshots/line-chart-vscode.png`
- [ ] `screenshots/empty-state.png`
- [ ] `screenshots/error-state.png`
- [ ] `screenshots/bar-chart-tooltip.png`

Screenshots are captured during E2E test runs with a running Storybook instance.

## Running E2E Tests

```bash
# Local development
pnpm --filter @debrief/components test:e2e ChartRenderer

# Claude Code environment
CLAUDE_CODE=1 pnpm --filter @debrief/components test:e2e ChartRenderer
```
