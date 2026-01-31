# Research: vscrui as Standard Component Library

**Feature**: 031-vscrui-component-library
**Date**: 2026-01-30

## Research Task 1: Confirm vscrui Component Inventory

**Decision**: vscrui provides the following components, confirmed from the upstream repository:

| Category | Components |
|----------|-----------|
| Form Elements | TextField, TextArea, Checkbox, Dropdown |
| Display | Badge, Label, Tag, Divider, Loader |
| Layout | Pane, Panels (tabs), Table / TableRow / TableCell |
| Interactive | Button (primary, secondary, icon variants) |
| Icons | Icon (Codicon-based, requires `vscrui/dist/codicon.css` import) |

**Rationale**: Upstream README and Storybook confirm these components. The inventory in the spec (FR-004) is accurate.

**Alternatives considered**: None — the component list is factual, not a design choice.

## Research Task 2: Installation and Peer Dependencies

**Decision**: Install via `npm install vscrui`. Peer dependency is React (18+). For icons, import `vscrui/dist/codicon.css`.

**Rationale**: Confirmed from upstream README.

## Research Task 3: Replacement of Deprecated Toolkit

**Decision**: vscrui replaces Microsoft's VS Code Webview UI Toolkit, which was deprecated on January 6, 2025. vscrui provides React components rather than web components, aligning with the project's React tech stack.

**Rationale**: Microsoft deprecated the toolkit with no direct successor. vscrui is the most mature React-based alternative designed specifically for VS Code webviews.

**Alternatives considered**:
- Raw HTML/CSS with VS Code CSS variables — too much manual work, inconsistent styling
- Shoelace/Lit web components — not React-native, adds complexity
- Custom component library — unnecessary when vscrui exists

## Research Task 4: Offline Bundling Compatibility

**Decision**: vscrui is distributed as an npm package and bundles normally with esbuild/webpack. No CDN dependencies. Codicon font files are included in the package distribution.

**Rationale**: Confirmed from package structure — all assets are local.

## Research Task 5: Documentation Location

**Decision**: Documentation will live at `shared/components/vscrui.md` per FR-008. A reference will be added to ARCHITECTURE.md per SC-004.

**Rationale**: `shared/components/` is the designated location for shared component documentation per CLAUDE.md project structure.
