# Quickstart: Log Panel (072)

**Date**: 2026-02-09

## Overview

The Log Panel is a VS Code sidebar panel that displays the analytical history (provenance log) of the current plot. It consumes data from the Log Service (#071) and renders it as an interactive timeline.

## Architecture at a Glance

```
┌───────────────────────────────────┐
│  VS Code Extension Host           │
│                                   │
│  LogPanelViewProvider             │
│  ├── subscribes to SessionManager │
│  ├── calls logService.getTimeline │
│  ├── calls store.setSelection     │
│  └── posts messages to webview    │
└───────────┬───────────────────────┘
            │ postMessage / onMessage
┌───────────▼───────────────────────┐
│  Webview (sandboxed iframe)       │
│                                   │
│  logPanel.tsx (entry script)      │
│  ├── receives timeline:update     │
│  ├── manages local filter state   │
│  ├── persists mode (getState)     │
│  └── renders <LogPanel />         │
│                                   │
│  @debrief/components              │
│  └── LogPanel/                    │
│      ├── LogPanel.tsx             │
│      ├── LogTimeline.tsx          │
│      ├── LogEntry.tsx             │
│      ├── LogFilterRow.tsx         │
│      ├── LogActionBar.tsx         │
│      └── LogPanel.stories.tsx     │
└───────────────────────────────────┘
```

## Key Integration Points

### 1. Log Service (dependency #071)

```
logService.getTimeline(storePath, itemPath) → LogEntry[]
```

Returns deduplicated, timestamp-sorted entries. The LogPanelViewProvider calls this when:
- The panel first opens
- The active session changes
- A tool execution completes (subscribed via store change)

### 2. Session State (selection)

```
store.getState().setSelection({ featureIds, primary, timestamp })
```

Called when the analyst selects a Log entry. Replaces the current map selection with the entry's affected features. Existing map panel reacts to the selection change automatically.

### 3. VS Code Activity Bar

The Log Panel registers a new activity bar container (`debrief-log`) with its own icon, separate from the existing Debrief container. Clicking the icon shows the Log Panel; clicking the Debrief icon shows the Activity Panel. They share the sidebar space.

## Component Hierarchy

```
LogPanel (root)
├── LogActionBar
│   ├── Action buttons (Tune, Revert to, Revert this, Snapshot, Rationale)
│   ├── View mode toggle (Timeline | By-Feature)
│   └── Presentation mode toggle (Compact | Normal | Detailed)
├── LogFilterRow (collapsible)
│   ├── Search text input
│   ├── Tool type dropdown
│   └── Operation category dropdown
└── LogEntryList
    ├── LogEntry (repeated)
    │   ├── Compact: tool name, feature name
    │   ├── Normal: + parameters, change summary
    │   └── Detailed: + timestamp, duration, attachments
    └── SnapshotBoundary (visual separator)
```

## Build & Test

### Build
```bash
# Build shared components (includes new LogPanel)
pnpm --filter @debrief/components build

# Build webview bundle
cd apps/vscode
pnpm run compile:webview  # includes logPanel.tsx entry point
```

### Test
```bash
# Unit tests for shared components
pnpm --filter @debrief/components test

# Storybook for visual verification
pnpm --filter @debrief/components storybook

# E2E tests (Playwright)
pnpm --filter @debrief/vscode test:e2e
```

## File Map

| Purpose | Path |
|---------|------|
| ViewProvider | `apps/vscode/src/views/logPanelView.ts` |
| Webview entry | `apps/vscode/src/webview/web/logPanel.tsx` |
| Extension registration | `apps/vscode/src/extension.ts` (add registration) |
| Package.json views | `apps/vscode/package.json` (add viewsContainers, views) |
| Shared components | `shared/components/src/LogPanel/` |
| Component types | `shared/components/src/LogPanel/types.ts` |
| Component stories | `shared/components/src/LogPanel/LogPanel.stories.tsx` |
| Component styles | `shared/components/src/LogPanel/LogPanel.css` |
| Strings module | `shared/components/src/LogPanel/strings.ts` |
