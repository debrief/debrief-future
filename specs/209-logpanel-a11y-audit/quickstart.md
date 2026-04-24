# Quickstart: LogPanel A11y Audit (Feature 209)

## Prerequisites

- Node.js 18+ and pnpm installed
- Repo cloned and `pnpm install` run at repo root

## Run the Full Audit (Cloud / CI)

```bash
cd shared/components
CLAUDE_CODE=1 pnpm exec playwright test e2e/LogPanelA11y.spec.ts
```

The `CLAUDE_CODE=1` flag triggers `@sparticuz/chromium` extraction (no separate browser install needed).

## Run the Full Audit (Local macOS / Windows)

```bash
# Install Chromium once
pnpm --filter @debrief/components exec playwright install chromium

# Run the audit
pnpm --filter @debrief/components exec playwright test e2e/LogPanelA11y.spec.ts
```

## View the Report

After the audit completes, open:

```
evidence/176-log-panel-ux/a11y-audit.md
```

## Run All LogPanel E2E Tests (including the audit)

```bash
pnpm --filter @debrief/components test
```

## Preview Theme Fix in Storybook

```bash
pnpm --filter @debrief/components storybook
# Open http://localhost:6006
# Navigate to LogPanel → Timeline Default
# Use the paintbrush icon in the toolbar to switch between Light / Dark / VS Code themes
```
