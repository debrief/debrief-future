# Research: List View with Spatial Thumbnails

**Feature**: 129-list-view-thumbnails
**Date**: 2026-03-06

## Research Questions

### RQ-001: Spatial Thumbnail Rendering Approach

**Decision**: Render thumbnails client-side as lightweight SVG/Canvas from GeoJSON track geometry.

**Rationale**:
- Exercise data already includes GeoJSON track geometry accessible via `assets.data` in STAC items
- Client-side rendering avoids server dependency (Constitution I.1 — offline by default)
- SVG is lightweight, theme-aware, and scales cleanly to small sizes
- Canvas fallback available for performance with dense tracks (5-8 per exercise)
- No image caching needed — render on demand from data already loaded

**Alternatives considered**:
- Pre-rendered static images stored as STAC assets: Requires a generation pipeline, bloats storage, can't adapt to theme changes
- Server-side rendering: Violates offline-by-default principle
- Leaflet mini-maps: Too heavyweight for list items, DOM overhead for 100+ instances

### RQ-002: Exercise Item Data Model Extension

**Decision**: Extend `CatalogOverviewItem` with a new `ExerciseListItem` interface that adds STAC extension metadata fields.

**Rationale**:
- `CatalogOverviewItem` provides the base (id, title, itemPath, bbox, datetime fields) but lacks metadata fields needed for the list view
- STAC extension properties from #125 (`debrief:vessel_classes`, `debrief:tags`, `debrief:author`, `debrief:nationalities`, `debrief:track_names`) must be available
- Extending rather than replacing preserves compatibility with CatalogOverview component
- Track geometry URL (`assets.data.href`) needed for thumbnail rendering

**Alternatives considered**:
- Modify `CatalogOverviewItem` directly: Breaks existing consumers (CatalogOverview, StacFileTree)
- Separate data fetch for metadata: Doubles I/O; metadata is already in item.json

### RQ-003: Virtualised Scrolling Strategy

**Decision**: Use `@tanstack/react-virtual` (already a project dependency at v3.0.0) with estimated row heights.

**Rationale**:
- Already used in `FeatureList` component — proven pattern in the codebase
- Handles variable row heights (recently opened items may differ from standard items)
- The mock pattern from `FeatureList.test.tsx` provides a tested virtualizer mock
- Row count up to 100+ items; virtualisation ensures only ~15-20 visible items are in the DOM

**Alternatives considered**:
- Native CSS `content-visibility: auto`: Less control over measurement, inconsistent browser support
- Render all items: Unacceptable for 100+ items with thumbnail rendering

### RQ-004: Sort Implementation Pattern

**Decision**: Comparator-based sorting with memoised sort functions, sort state in component local state.

**Rationale**:
- Three sort dimensions (recency, title, duration) map cleanly to comparator functions
- `useMemo` with sort dimension + direction as dependencies ensures re-sort only when needed
- Local component state for sort selection aligns with existing CatalogOverview state pattern (no Zustand needed)
- Direction toggle is a simple state inversion

**Alternatives considered**:
- Sort in Zustand session-state store: Over-engineered; sort is UI-only state, not document state
- Sort server-side: No server in the discovery UI; all data is client-side

### RQ-005: Recently Opened Items in Webview Context

**Decision**: Recently opened items are provided to the list view as a data prop from the extension host via the message protocol.

**Rationale**:
- `RecentPlotsService` already exists in the VS Code extension with `getRecentPlots()` API
- The webview cannot access `workspaceState` directly — data must flow through postMessage
- The extension host sends recent plots when the webview loads and after any plot is opened
- This follows the existing pattern: extension manages persistence, webview renders

**Alternatives considered**:
- LocalStorage in webview: Not persistent across VS Code restarts; duplicates state
- Zustand session-state: Recently opened is cross-session state, not per-document state

### RQ-006: Theme Integration for Thumbnails

**Decision**: Use existing VS Code CSS custom property pattern from CatalogOverview, with dedicated thumbnail colour variables.

**Rationale**:
- CatalogOverview already maps `--vscode-*` variables to component-scoped variables (`--co-*`)
- Thumbnails need track stroke colour and background that adapt to light/dark/vscode themes
- Storybook ThemeProvider enables story-level theme testing (3 variants: light, dark, vscode)
- Consistent with all other shared components

**Alternatives considered**:
- Inline styles: Not theme-aware, harder to maintain
- Separate stylesheet per theme: Overly complex for a small component

### RQ-007: Filter Integration Contract

**Decision**: The list view subscribes to a shared filter state via props (or context). Filter evaluation uses the CQL2 filter engine from #126.

**Rationale**:
- The three-view synchronisation (#132) will provide a shared filter state; this spec defines the list's consumption contract
- For initial Storybook development, filter state can be passed as props with mock data
- The CQL2 filter engine (#126) already evaluates predicates against STAC items in-memory
- Dynamic updates (FR-013) achieved via React re-render when filter state prop changes

**Alternatives considered**:
- List implements its own filtering: Duplicates #126 logic; violates DRY
- Server-side filtering: No server in discovery UI phase
