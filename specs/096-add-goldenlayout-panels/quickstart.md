# Quickstart: GoldenLayout Panel Management

**Feature**: 096-add-goldenlayout-panels
**Audience**: Developers implementing this feature

---

## Prerequisites

- Node.js 18+ and pnpm installed
- Repository cloned and dependencies installed: `pnpm install`
- Familiarity with the web-shell app (`apps/web-shell/`)
- Familiarity with shared components (`shared/components/`)

## Key Files to Understand First

| File | What it does | Why it matters |
|------|-------------|----------------|
| `apps/web-shell/src/App.tsx` | Orchestrates welcome/analysis views, all state, all callbacks | This is the file being refactored — the analysis view's layout section moves into GoldenLayout |
| `apps/web-shell/src/App.css` | Flexbox layout for sidebar + right panel | The CSS layout rules for `.web-shell__sidebar` and `.web-shell__right-panel` will be replaced by GoldenLayout |
| `shared/components/src/index.ts` | Barrel exports for all shared components | Panel content components (MapView, ActivityPanel, LogPanel, etc.) are imported from here |
| `apps/web-shell/src/hooks/useSessionStore.ts` | Zustand store hook for session state | Panels need access to this store; pop-out windows need cross-window sync |
| `apps/web-shell/vite.config.ts` | Build configuration | May need CSS imports for GoldenLayout stylesheets |

## Implementation Steps (Overview)

### Step 1: Install Dependencies

```bash
cd apps/web-shell
pnpm add golden-layout shared-zustand
```

### Step 2: Create Panel Registry

Create `shared/components/src/PanelWorkspace/panelRegistry.ts`:
- Implement a `Map<string, PanelDefinition>` with register/unregister/get methods
- Register the five default panels: navigation, activity, log, map, chart

### Step 3: Create GoldenLayout React Bridge

Create `shared/components/src/PanelWorkspace/goldenLayoutBridge.ts`:
- Handle `bindComponentEvent`: look up panel type in registry, create React root, render component
- Handle `unbindComponentEvent`: unmount React root
- Provide `PanelProps` (container, isPopout, panelId) to each component

### Step 4: Create PanelWorkspace Component

Create `shared/components/src/PanelWorkspace/PanelWorkspace.tsx`:
- Mount GoldenLayout into a container div
- Load layout from localStorage (or use default)
- Save layout on changes (debounced)
- Expose "Reset Layout" action
- Import GoldenLayout CSS (`goldenlayout-base.css` + custom theme)

### Step 5: Create Panel Content Wrappers

For each panel, create a thin wrapper that bridges between `PanelProps` and the existing component's props:
- `MapPanel.tsx`: Wraps `MapView`, listens for container resize → `invalidateSize()`
- `ActivityPanel.tsx`: Wraps existing `ActivityPanel` (no changes needed inside)
- `LogPanel.tsx`: Wraps existing `LogPanel`
- `NavigationPanel.tsx`: Wraps `StacFileTree`
- `ChartPanel.tsx`: Wraps `ChartRenderer`

### Step 6: Add Cross-Window State Sync

In the session-state store initialization:
- Import `shared-zustand`'s `share` and `isSupported`
- Share temporal, selection, and visibility slices via BroadcastChannel
- Guard with `isSupported()` check for graceful degradation

### Step 7: Update App.tsx

Replace the analysis view's flexbox layout with `<PanelWorkspace>`:
- Keep the welcome view rendering unchanged
- Replace `<aside>` + `<section>` with `<PanelWorkspace registry={registry} />`
- Move state and callbacks into React context providers above PanelWorkspace
- Keep the header bar (Back button, title, undo/redo) outside PanelWorkspace

### Step 8: Theme GoldenLayout

Create `goldenlayout-debrief-theme.css`:
- Override GoldenLayout's `.lm_*` classes with VS Code CSS variables from `tokens.css`
- Match existing web-shell dark theme appearance

### Step 9: Add Layout Persistence

- Save layout to localStorage on `stateChanged` event (debounced 500ms)
- Load and validate on mount
- Version check → fallback to default on mismatch
- "Reset Layout" button in header

### Step 10: Write Tests

- Unit tests for Panel Registry (register, get, has, unregister)
- Unit tests for layout persistence (save, load, version mismatch, corrupt data)
- E2E tests with Playwright:
  - Default layout renders all 5 panels
  - Panel resize works
  - Layout persists across page reload
  - Reset Layout restores default
  - Welcome → Analysis transition

## Running the App

```bash
# Development server
cd apps/web-shell
pnpm dev

# Build
pnpm build

# Run Playwright E2E tests
pnpm test

# Run unit tests
pnpm test:unit
```

## Common Pitfalls

1. **Leaflet map not filling panel**: Call `map.invalidateSize()` after GoldenLayout fires the container resize event. Use a small timeout (0ms `setTimeout`) for initial render.

2. **React context lost in pop-out**: Pop-out windows re-mount components in a new React tree. Use Zustand hooks (not React Context) for shared state. The `shared-zustand` BroadcastChannel sync handles cross-window updates.

3. **CSS not loaded in pop-out window**: GoldenLayout injects stylesheets into pop-out windows, but custom CSS may need explicit injection. Verify theme CSS loads correctly.

4. **Layout save storms**: GoldenLayout fires `stateChanged` events frequently during resize. Debounce the save (500ms) to avoid excessive localStorage writes.

5. **Stale layout after code changes**: If you change the default panel types, bump the layout version number. Old saved layouts with unknown panel types will be discarded gracefully.
