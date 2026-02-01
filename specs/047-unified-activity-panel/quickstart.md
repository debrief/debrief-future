# Quickstart: Unified Debrief Activity Panel

**Feature**: 047-unified-activity-panel

## Prerequisites

- Node.js 18+
- pnpm installed
- Repository cloned with dependencies installed (`pnpm install`)

## Development Workflow

### 1. Start Storybook (component development)

```bash
cd shared/components
pnpm storybook
```

Develop sub-components in isolation:
- `TimeController` — convert PlaybackControls, SpeedSelector, DisplayModeToggle to vscrui; TimeScrubber stays custom
- `ToolsPanel` — new component, build with vscrui Button/Icon/Divider
- `LayersToolbar` + `FeatureList` — already exist (from #045), verify in Storybook
- `ActivityPanel` — composed panel using vscrui Pane for collapsible sections

Use the theme toolbar (light / dark / VS Code) to verify all three variants.

### 2. Test in VS Code (integration)

```bash
cd apps/vscode
pnpm compile
# Press F5 in VS Code to launch Extension Development Host
```

The unified panel appears in the Debrief activity bar sidebar.

### 3. Run tests

```bash
# Component tests
cd shared/components
pnpm test

# Extension tests
cd apps/vscode
pnpm test
```

## Key Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `shared/components/src/ToolsPanel/ToolsPanel.tsx` | React component for tools list |
| `shared/components/src/ActivityPanel/ActivityPanel.tsx` | Composed panel with three Pane sections |
| `shared/components/src/ActivityPanel/ActivityPanel.stories.tsx` | Storybook stories |
| `shared/components/src/ToolsPanel/ToolsPanel.stories.tsx` | Storybook stories |
| `apps/vscode/src/views/activityPanelView.ts` | WebviewViewProvider for unified panel |
| `apps/vscode/src/webview/web/activityPanel.tsx` | Webview entry point (React bootstrap) |

### Modified Files

| File | Change |
|------|--------|
| `shared/components/src/TimeController/PlaybackControls.tsx` | Convert buttons to vscrui Button + Icon |
| `shared/components/src/TimeController/SpeedSelector.tsx` | Convert to vscrui Dropdown |
| `shared/components/src/TimeController/DisplayModeToggle.tsx` | Convert to vscrui Button toggle |
| `shared/components/src/TimeController/TimeController.css` | Update styles for vscrui components |
| `apps/vscode/package.json` | Replace 3 view registrations with 1 webview view |
| `apps/vscode/src/extension.ts` | Register `ActivityPanelViewProvider`, remove old providers |
| `shared/components/src/index.ts` | Export new components |

### Removed/Deprecated

| File | Reason |
|------|--------|
| `apps/vscode/src/views/timeRangeView.ts` | Replaced by unified panel |
| `apps/vscode/src/providers/toolsTreeProvider.ts` | Replaced by React ToolsPanel |
| `apps/vscode/src/providers/layersTreeProvider.ts` | Replaced by LayersToolbar + FeatureList in webview |
| `apps/vscode/src/views/toolsView.ts` | Replaced by unified panel |
| `apps/vscode/src/views/layersView.ts` | Replaced by unified panel |

## Architecture Overview

```
Extension Host                          Webview (React)
┌─────────────────────┐                ┌──────────────────────────┐
│ ActivityPanelView    │  postMessage   │ ActivityPanel            │
│   Provider           │ ◄──────────► │   ├─ Pane: TimeController │
│                      │               │   ├─ Pane: ToolsPanel    │
│ SessionManager ──────┤               │   └─ Pane: Layers        │
│   .temporal          │               │                          │
│   .selection         │               │ ThemeProvider (vscode)   │
│   .layers            │               │ vscode.setState()        │
└─────────────────────┘                └──────────────────────────┘
```
