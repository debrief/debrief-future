# Quickstart: Results Bottom Panel

**Feature**: 095-results-bottom-panel
**Date**: 2026-02-14

## Prerequisites

- Node.js 18+
- pnpm (workspace package manager)
- VS Code ^1.85.0 (for extension development)
- Feature #085 (ChartRenderer) merged and available in `@debrief/components`

## Setup

```bash
# From repository root
pnpm install

# Build shared components (includes ChartRenderer)
pnpm --filter @debrief/components build

# Build session-state
pnpm --filter @debrief/session-state build
```

## Development Workflow

### 1. Shared Component Development

The `ResultsPanel` React component lives in the shared component library:

```bash
# Start Storybook for visual development
pnpm --filter @debrief/components storybook

# Run unit tests in watch mode
pnpm --filter @debrief/components test -- --watch ResultsPanel
```

Key files:
- `shared/components/src/ResultsPanel/ResultsPanel.tsx` — main container
- `shared/components/src/ResultsPanel/ResultsPanel.stories.tsx` — Storybook stories
- `shared/components/src/ResultsPanel/ResultsPanel.test.tsx` — unit tests

### 2. VS Code Extension Development

```bash
# Build extension + webviews
cd apps/vscode
npm run compile

# Or in watch mode (rebuilds on save)
npm run dev
```

Key files:
- `apps/vscode/src/views/resultsPanelView.ts` — WebviewViewProvider
- `apps/vscode/src/webview/web/resultsPanel.tsx` — webview entry point
- `apps/vscode/src/webview/messages.ts` — message type definitions

### 3. Testing in VS Code

1. Open the repo in VS Code
2. Press F5 to launch Extension Development Host
3. In the dev host:
   - Add a STAC store with result data
   - Open a plot
   - Run a tool (or manually place a JSON/PNG file in `assets/results/`)
   - Observe the results panel in the bottom area

## Architecture Overview

```
┌─────────────────────────────┐     postMessage      ┌─────────────────────────────────┐
│  Extension Host             │ ◄──────────────────► │  Webview (resultsPanel.tsx)      │
│                             │                       │                                 │
│  ResultsPanelViewProvider   │  results:addTab       │  ResultsPanel (React)           │
│  ├── TabState (Map)         │  results:updateContent│  ├── ResultTabBar               │
│  ├── FileSystemWatchers     │  results:removeTab    │  ├── ResultTabContent            │
│  └── File reading           │  ───────────────►     │  │   ├── ChartRenderer (#085)   │
│                             │                       │  │   ├── ImageViewer             │
│  Entry points:              │  results:closeTab     │  │   └── FallbackViewer          │
│  ├── executeTool (auto)     │  results:selectTab    │  └── Empty state                │
│  ├── openResultArtifact     │  ◄───────────────     │                                 │
│  └── STAC browser context   │                       │                                 │
└─────────────────────────────┘                       └─────────────────────────────────┘
```

## Key Patterns

### Tab Identity
Tab ID = `${plotItemPath}::${resultFilePath}` — ensures uniqueness across plots.

### Content Routing
```
JSON file → attempt DatasetEnvelope parse
  → success → transformDataset() → ChartRenderer
  → failure → FallbackViewer

Image file (image/* MIME) → base64 data URI → ImageViewer

Other file → file metadata → FallbackViewer
```

### File Watching
One `FileSystemWatcher` per open tab. Debounced 200ms. Disposed on tab close.

### Message Queueing
If the webview is not ready when a message is sent, queue it. Flush on `results:webviewReady`. Same pattern as `ActivityPanelViewProvider`.

## Testing Strategy

| Layer | Tool | Scope |
|-------|------|-------|
| Unit (component) | Vitest | ResultsPanel, ResultTabBar, ResultTabContent, ImageViewer, FallbackViewer |
| Unit (transformer) | Vitest | Content routing logic, tab title derivation |
| Storybook stories | Storybook | Visual regression, theme variants |
| E2E (Storybook) | Playwright | Tab interaction, close, switch, tooltip |
| Integration | VS Code Extension Development Host | End-to-end with real STAC data |

## File Manifest

### New Files

| Path | Purpose |
|------|---------|
| `shared/components/src/ResultsPanel/index.ts` | Public exports |
| `shared/components/src/ResultsPanel/ResultsPanel.tsx` | Container component |
| `shared/components/src/ResultsPanel/ResultsPanel.test.tsx` | Unit tests |
| `shared/components/src/ResultsPanel/ResultsPanel.stories.tsx` | Storybook stories |
| `shared/components/src/ResultsPanel/ResultTabBar.tsx` | Tab strip |
| `shared/components/src/ResultsPanel/ResultTabContent.tsx` | Content router |
| `shared/components/src/ResultsPanel/ImageViewer.tsx` | Image display |
| `shared/components/src/ResultsPanel/FallbackViewer.tsx` | Fallback summary |
| `shared/components/src/ResultsPanel/types.ts` | Type definitions |
| `shared/components/e2e/ResultsPanel.spec.ts` | Playwright E2E tests |
| `apps/vscode/src/views/resultsPanelView.ts` | WebviewViewProvider |
| `apps/vscode/src/webview/web/resultsPanel.tsx` | Webview entry point |

### Modified Files

| Path | Change |
|------|--------|
| `apps/vscode/package.json` | Add view container (panel), view, command, activation event |
| `apps/vscode/esbuild.config.js` | Add resultsPanel webview entry point |
| `apps/vscode/src/extension.ts` | Register ResultsPanelViewProvider |
| `apps/vscode/src/webview/messages.ts` | Add results panel message types |
| `apps/vscode/src/commands/index.ts` | Redirect openResultArtifact to panel |
| `shared/components/src/index.ts` | Export ResultsPanel |
