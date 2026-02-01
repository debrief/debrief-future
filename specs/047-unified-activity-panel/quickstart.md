# Quickstart: Unified Debrief Activity Panel

## Prerequisites

- Node.js 18+
- pnpm installed
- VS Code 1.85+ (for extension testing)
- Dependencies: `pnpm install` from repo root

## Development Order

### 1. CollapsibleSection component

Create `shared/components/src/ActivityPanel/CollapsibleSection.tsx`:
- Uses vscrui `Pane` for header styling
- Manages expand/collapse with CSS transitions
- Props: `id`, `title`, `icon`, `collapsed`, `onToggle`, `children`
- Add Storybook story demonstrating collapse behavior

### 2. ToolsList component

Create `shared/components/src/ToolsList/ToolsList.tsx`:
- Renders `ToolItemContract[]` as clickable rows
- Active tools: clickable with execute action
- Inactive tools: greyed out with explanation tooltip
- Empty states: "Select features to see tools" / "No tools available"
- Uses vscrui `Button`, `Icon`, `Label` components
- Add Storybook story with mock tool data

### 3. ActivityPanel container

Create `shared/components/src/ActivityPanel/ActivityPanel.tsx`:
- Composes 3 `CollapsibleSection` instances
- Wraps each sub-component in React `ErrorBoundary`
- Manages collapse state, calls `onSectionToggle` callback
- Section order: Time Controller, Tools, Layers (fixed)
- Add Storybook story showing all sections

### 4. Webview entry point

Create `apps/vscode/src/webview/web/activityPanel.tsx`:
- Acquires VS Code API
- Translates messages to/from component props
- Persists collapse state via `getState()`/`setState()`
- Renders `ActivityPanel` into `#root`

### 5. WebviewViewProvider

Create `apps/vscode/src/views/activityPanelView.ts`:
- Implements `WebviewViewProvider` for `debrief.activity`
- Subscribes to `SessionManager` for time, selection, features
- Subscribes to `ToolMatchAdapter` for tool matches
- Posts messages to webview on state changes
- Handles incoming messages (execute tool, toggle visibility, etc.)
- Queues messages until webview ready

### 6. Extension manifest update

Update `apps/vscode/package.json`:
- Replace `debrief.timeRange`, `debrief.tools`, `debrief.layers` views with single `debrief.activity` webview view
- Update `extension.ts` to register `ActivityPanelView` instead of the three separate providers

### 7. esbuild config update

Update `apps/vscode/esbuild.config.js`:
- Add/replace entry point for `activityPanel.tsx`
- Output to `dist/webview/activityPanel.js`

## Running

```bash
# Shared components dev (Storybook)
cd shared/components
pnpm storybook

# Build extension
cd apps/vscode
pnpm build

# Test in VS Code
# Press F5 to launch Extension Development Host
```

## Testing Checklist

- [ ] All 3 sections render in single panel
- [ ] Each section collapses/expands independently
- [ ] Collapse state persists across panel close/reopen
- [ ] Time Controller responds to session time changes
- [ ] Tools update when selection changes
- [ ] Layers show features with visibility toggles
- [ ] Error in one section doesn't crash others
- [ ] Panel uses less vertical space than 3 separate panels
- [ ] Components render in Storybook without VS Code
