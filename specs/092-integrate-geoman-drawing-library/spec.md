# Feature Specification: Integrate Geoman Drawing Library

**Feature Branch**: `092-integrate-geoman-drawing-library`
**Created**: 2026-02-13
**Status**: Draft
**Input**: User description: "[E05] Integrate Geoman drawing library — install @geoman-io/leaflet-geoman-free, configure with existing react-leaflet MapContainer, verify esbuild bundling for VS Code webview, verify Storybook rendering, create proof-of-concept story"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Geoman Initializes on Existing Map (Priority: P1)

A developer opens the MapView Storybook story and sees that Geoman is available on the Leaflet map instance. The Geoman drawing controls are not visible by default (they will be surfaced by later E05 features), but calling `map.pm.enableDraw('Polygon')` programmatically starts a polygon drawing session on the map. The developer can draw a polygon, and Geoman fires its `pm:create` event with the created layer.

**Why this priority**: This is the foundational integration. If Geoman does not initialize correctly on the existing Leaflet map, nothing else in E05 works. This validates that the library is compatible with the project's react-leaflet 4.2 stack and Leaflet 1.9.x.

**Independent Test**: Can be fully tested by loading a Storybook story that initializes Geoman on the map, calling `map.pm.enableDraw('Polygon')`, drawing a shape, and verifying `pm:create` fires with a valid GeoJSON layer.

**Acceptance Scenarios**:

1. **Given** MapView is rendered with Geoman initialized, **When** `map.pm.enableDraw('Polygon')` is called programmatically, **Then** the map enters polygon drawing mode and the cursor changes to crosshair.
2. **Given** the map is in polygon drawing mode, **When** the user clicks to place vertices and double-clicks to finish, **Then** Geoman fires a `pm:create` event containing the drawn layer with valid GeoJSON geometry.
3. **Given** Geoman is initialized on the map, **When** no drawing mode is explicitly enabled, **Then** the map behaves identically to its pre-Geoman state — no visible toolbar, no drawing cursor, no interference with existing click/selection behavior.

---

### User Story 2 - VS Code Webview Bundle Builds Successfully (Priority: P1)

A developer runs the VS Code extension build (`npm run compile:webview`) and the esbuild process completes without errors. The mapView.js bundle includes the Geoman library. When the VS Code extension is launched, the map panel loads without errors and existing functionality (track display, selection, temporal rendering) works as before.

**Why this priority**: The VS Code webview uses esbuild with IIFE format and `.css=text` loader. Geoman ships CSS and may have asset references that break under this bundling strategy. Verifying the build works is equally critical to verifying the library initializes — a broken build blocks the entire E05 epic.

**Independent Test**: Can be fully tested by running `npm run compile` in apps/vscode and verifying (a) the build completes without errors, (b) the output bundle size is reasonable, and (c) existing map panel functionality works in the running extension.

**Acceptance Scenarios**:

1. **Given** @geoman-io/leaflet-geoman-free is installed as a dependency, **When** `npm run compile:webview` is run in apps/vscode, **Then** the build completes with exit code 0 and no esbuild errors.
2. **Given** the VS Code extension is built with Geoman bundled, **When** the extension is launched and a plot is opened, **Then** the map panel renders correctly with all existing features (tracks, selection, temporal playback) unaffected.
3. **Given** Geoman CSS needs to be loaded, **When** the webview initializes, **Then** Geoman CSS is injected into the webview without visual artifacts or console errors.

---

### User Story 3 - Storybook Proof-of-Concept Story (Priority: P2)

A developer opens Storybook and navigates to a "Drawing" story category. A "GeomanIntegration" story shows the MapView with Geoman drawing controls visible. The developer can select a shape tool (polygon, rectangle, marker) from the Geoman toolbar, draw a shape on the map, and see the created GeoJSON geometry logged below the map. This story serves as the reference implementation for E05 consumers.

**Why this priority**: The Storybook story is the primary development and verification artifact for this integration. It validates that Geoman works in the Vite/Storybook environment (separate from the esbuild/VS Code environment) and provides a visual, interactive demonstration. Lower than P1 because it depends on Geoman initialization working first.

**Independent Test**: Can be tested by running Storybook, navigating to the GeomanIntegration story, drawing shapes using the Geoman toolbar, and verifying the drawn GeoJSON appears in the logged output.

**Acceptance Scenarios**:

1. **Given** Storybook is running, **When** the developer navigates to the GeomanIntegration story, **Then** the MapView renders with Geoman drawing toolbar controls visible.
2. **Given** the GeomanIntegration story is active, **When** the developer draws a polygon, **Then** the polygon appears on the map and its GeoJSON geometry is logged to the story's action panel.
3. **Given** the GeomanIntegration story is active, **When** the developer draws a rectangle, **Then** the rectangle appears on the map as a valid GeoJSON polygon.
4. **Given** the GeomanIntegration story is active with ThemeProvider set to "vscode" theme, **When** shapes are drawn, **Then** the Geoman toolbar and drawn shapes are visually consistent with the VS Code dark theme.

---

### User Story 4 - No Regressions in Existing Map Behavior (Priority: P1)

An analyst using the existing VS Code extension opens a plot, views tracks on the map, selects features, uses the time slider, and drags/zooms the map. All existing behavior works identically to before the Geoman integration. Geoman is loaded but dormant — it adds no visible UI and intercepts no events until explicitly activated by later E05 features.

**Why this priority**: Regression prevention is non-negotiable. Geoman must be a passive addition that does not alter any existing behavior.

**Independent Test**: Can be tested by running the existing MapView test suite and verifying all tests pass without modification.

**Acceptance Scenarios**:

1. **Given** Geoman is initialized on the map, **When** the user clicks a track feature, **Then** the existing selection handler fires and the feature is selected (Geoman does not intercept the click).
2. **Given** Geoman is initialized on the map, **When** the user drags to pan the map, **Then** the map pans normally (Geoman does not intercept the drag).
3. **Given** Geoman is initialized on the map, **When** the time slider is moved, **Then** temporal track rendering updates correctly (no Geoman interference).
4. **Given** Geoman is initialized on the map, **When** all existing MapView unit tests are run, **Then** 100% of tests pass without modification.

---

### Edge Cases

- What happens when Geoman CSS fails to load? The drawing toolbar appears unstyled but functional. The map continues to work normally.
- What happens when Geoman is initialized on a map that already has GeoJSON layers? Geoman does not modify existing layers. Only layers created through Geoman's draw API are managed by Geoman.
- What happens when the map container is resized while drawing? Geoman handles resize events internally; the in-progress drawing adapts to the new container size.
- What happens when multiple MapView instances exist (e.g., split pane)? Each MapView initializes its own Geoman instance independently. Drawing on one map does not affect the other.
- What happens when Leaflet is updated to a later 1.9.x patch? Geoman ^2.x is compatible with Leaflet 1.9.x. No action needed for patch updates.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST install `@geoman-io/leaflet-geoman-free` as a dependency of `@debrief/components` (shared/components).
- **FR-002**: System MUST initialize Geoman on the Leaflet map instance during MapView component mount, after the map is ready.
- **FR-003**: Geoman MUST be initialized with its default toolbar disabled (`addControls: false`) so no drawing UI appears until explicitly enabled by consuming code.
- **FR-004**: Geoman CSS MUST be imported and available in both the Vite/Storybook environment and the esbuild/VS Code webview environment.
- **FR-005**: The esbuild webview build (`compile:webview`) MUST complete without errors with Geoman included in the bundle.
- **FR-006**: Geoman MUST NOT intercept or modify any existing map events (click, drag, zoom, selection) when no drawing mode is enabled.
- **FR-007**: A Storybook story MUST demonstrate Geoman drawing capability with at least polygon, rectangle, and marker shape types.
- **FR-008**: The Storybook story MUST log created GeoJSON geometry via Storybook actions when shapes are drawn.
- **FR-009**: All existing MapView unit tests MUST pass without modification after Geoman integration.
- **FR-010**: Geoman initialization MUST be encapsulated in a dedicated hook or component (`useGeoman` or `GeomanControl`) that can be optionally included by consuming MapView instances.
- **FR-011**: The Geoman integration MUST work offline — no CDN references for CSS or assets (Constitution Article I).
- **FR-012**: TypeScript type definitions for Geoman MUST be available (either from the package or a local declaration file).

### Key Entities

- **GeomanControl**: A react-leaflet-compatible component or hook that initializes Geoman on the map instance. Encapsulates Geoman lifecycle (init on mount, cleanup on unmount) and exposes Geoman events to React consumers.
- **GeomanOptions**: Configuration for Geoman initialization — controls visibility (toolbar on/off), enabled shape types, snap settings, and style defaults.

## User Interface Flow *(optional - include for UI features)*

### Decision Analysis

- **Primary Goal**: Enable Geoman drawing library on the Leaflet map so downstream E05 features can use it for shape drawing.
- **Key Decision(s)**:
  1. This is an infrastructure integration — there is no end-user decision flow. Developers decide when to enable drawing via the exposed API.
- **Decision Inputs**: Geoman API documentation and the `GeomanControl` component/hook API.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | MapView rendered (no drawing active) | Map loads normally | Geoman is initialized but dormant — no visible change |
| 2 | Developer/consumer enables drawing | Consumer calls `map.pm.enableDraw('Polygon')` or activates via toolbar | Map enters drawing mode, cursor changes to crosshair |
| 3 | Drawing in progress | User clicks to place vertices | Shape preview renders on map |
| 4 | Drawing complete | User double-clicks to finish (polygon) or single-clicks (marker) | `pm:create` event fires with the drawn GeoJSON layer |
| 5 | Drawing mode disabled | Consumer calls `map.pm.disableDraw()` | Map returns to normal interaction mode |

### UI States

- **Dormant State**: Geoman loaded but no drawing mode active. Map behaves exactly as before. No visible Geoman UI.
- **Drawing Active State**: Drawing mode enabled for a specific shape type. Cursor is crosshair. Click events create vertices/points.
- **Shape Preview State**: During drawing, a preview of the in-progress shape renders on the map following the cursor.
- **Shape Complete State**: After completing a shape, it renders as a Leaflet layer on the map. The `pm:create` event has fired.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `@geoman-io/leaflet-geoman-free` is installed in `shared/components/package.json` and the package resolves correctly.
- **SC-002**: `npm run compile:webview` in `apps/vscode` completes with exit code 0 and produces a valid mapView.js bundle.
- **SC-003**: A Storybook story named "GeomanIntegration" renders the map with Geoman controls and allows interactive shape drawing of at least three shape types (polygon, rectangle, marker).
- **SC-004**: All existing MapView unit tests pass without any test file modifications.
- **SC-005**: Geoman initialization produces no console errors in either the Storybook or VS Code webview environment.
- **SC-006**: The `GeomanControl` hook/component provides a clean React API for enabling/disabling Geoman features, without requiring direct Leaflet map instance access from consuming code.
- **SC-007**: Geoman CSS loads correctly in both Vite (Storybook) and esbuild (VS Code webview) bundling environments with no missing styles or broken asset references.

## Assumptions

- `@geoman-io/leaflet-geoman-free` version 2.x (latest 2.19.2) is compatible with Leaflet 1.9.x — the package declares peer dependency `leaflet: "^1.2.0"`.
- Geoman ships built-in TypeScript definitions (`dist/leaflet-geoman.d.ts`) — no `@types/` package needed.
- Geoman auto-attaches to Leaflet on import, adding `map.pm` to every `L.Map` instance. The integration uses `L.PM.setOptIn(true)` to prevent Geoman from managing all layers by default.
- Geoman CSS is at `dist/leaflet-geoman.css` and must be explicitly imported (no `"style"` field in package.json).
- Geoman brings transitive dependencies: `@turf/boolean-contains`, `@turf/kinks`, `@turf/line-intersect`, `@turf/line-split`, `lodash`, `polygon-clipping`. These add bundle size but are required for snapping and geometry operations.
- The esbuild `.css=text` loader used for VS Code webview bundling can handle Geoman's CSS — the CSS will be injected at runtime similar to `leaflet/dist/leaflet.css`.
- Geoman's MIT-licensed free version provides sufficient functionality for the E05 epic's needs (polygon, rectangle, polyline, marker drawing). The paid Pro version is not needed.
- The react-leaflet integration follows the `createControlComponent` pattern from `@react-leaflet/core`, wrapping Geoman's `L.Control.extend` API.
- Later E05 features (#093, #094, #095, #096) will build on this integration to add the toolbar UI, specific shape drawing workflows, and STAC persistence. This feature only establishes the foundation.
- The `useGeoman` hook or `GeomanControl` component created here defines the API contract that downstream E05 features will consume.

## Technology

- TypeScript 5.x (shared components, VS Code extension webview)
- React 18.x, react-leaflet 4.2, Leaflet 1.9.x (existing stack)
- `@geoman-io/leaflet-geoman-free` ^2.19.2 (new dependency — MIT, ships TypeScript defs)
- Vite (Storybook dev/build), esbuild (VS Code webview bundling)
- Storybook 8.x (story development and verification)
