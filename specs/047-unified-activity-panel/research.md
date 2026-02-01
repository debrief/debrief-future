# Research: Unified Debrief Activity Panel

**Date**: 2026-02-01
**Feature**: 047-unified-activity-panel

## R1: Consolidation Strategy — Single Webview vs Multiple Views

**Decision**: Replace three separate VS Code views (one webview + two TreeViews) with a single webview hosting all three sub-components as React components.

**Rationale**:
- Currently `debrief.timeRange` is a React webview, but `debrief.tools` and `debrief.layers` are native VS Code TreeViews
- A single webview eliminates the multi-panel chrome overhead (each VS Code view has its own header, collapse control, and padding), directly achieving the 20% vertical space reduction target
- A single webview allows shared React context (ThemeProvider, SessionManager state) without cross-view message passing
- Sub-components remain independently importable from `@debrief/components`

**Alternatives considered**:
- Keep native TreeViews for tools/layers → rejected because VS Code view chrome per-panel adds ~30px overhead each and prevents unified layout control
- Use VS Code's built-in collapsible sections within a single TreeView → rejected because TreeViews cannot host React components or complex interactive UI

## R2: vscrui Pane Component for Collapsible Sections

**Decision**: Use vscrui `Pane` component for collapsible section containers within the unified webview.

**Rationale**:
- vscrui provides `Pane` with built-in title, collapse/expand, and action slot — matches FR-002 exactly
- Pane already renders with VS Code native styling via CSS variables
- Documented in `shared/components/vscrui.md` but not yet used in codebase — this feature is the natural first adopter
- Pane supports Codicon icons in title area, satisfying FR-010

**Alternatives considered**:
- Custom collapsible component → rejected because vscrui Pane already exists and is the project standard
- HTML `<details>/<summary>` → rejected because styling inconsistency with VS Code and no Codicon support

## R3: Tools and Layers Conversion from TreeView to React

**Decision**: Create new React components `ToolsPanel` and `LayersPanel` in `shared/components/` that replicate the functionality of the existing `ToolsTreeProvider` and `LayersTreeProvider`.

**Rationale**:
- TreeDataProvider outputs cannot be embedded in a webview — they are VS Code native UI only
- Existing providers contain the data logic (tool matching, layer filtering) which can be reused via message passing from the extension host
- The React components consume the same data structures but render with vscrui components
- `FeatureList` component already exists and can be leveraged for the layers list

**Alternatives considered**:
- Embed TreeViews inside webview via iframe → not supported by VS Code API
- Keep tools/layers as native TreeViews alongside a webview → defeats the single-panel goal

## R4: State Communication Pattern

**Decision**: Use VS Code webview message passing (postMessage/onDidReceiveMessage) with a typed message protocol, same pattern as existing `timeController.tsx` webview entry point.

**Rationale**:
- Proven pattern already in use for TimeController
- SessionManager in the extension host is the single source of truth for selection, temporal, and spatial state
- Each sub-component subscribes to relevant state slices via typed messages
- Collapse state managed locally in the webview (session-scoped via `vscode.setState()`)

**Alternatives considered**:
- Direct Zustand store sharing between extension host and webview → not possible (separate JS contexts)
- SharedWorker → not available in VS Code webviews

## R5: Package.json View Registration

**Decision**: Register a single new webview view `debrief.activityPanel` and remove the three existing view registrations (`debrief.timeRange`, `debrief.tools`, `debrief.layers`).

**Rationale**:
- VS Code sidebar views are configured in `package.json` under `contributes.views`
- A single webview view replaces three entries, simplifying configuration
- The view type must be `"webview"` to host React content

**Alternatives considered**:
- Keep old views and add new one with a setting toggle → adds maintenance burden and violates single-panel goal
