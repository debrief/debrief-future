# Feature Specification: VS Code Theme Responsiveness

**Feature Branch**: `220-fix-theme-responsiveness`
**Created**: 2026-04-22
**Updated**: 2026-04-25 (added root-cause findings from research spike on `claude/research-theme-switching-tAFvB`)
**Status**: Draft
**Input**: User description: "VS Code styled components do not properly react to light/dark theme settings. Fix theme responsiveness as part of 209."

## Root Cause Summary *(from research spike, 2026-04-25)*

A code survey of `shared/components/` and `apps/vscode/src/webview/` confirmed three concrete defects that produce the observed symptom. These are recorded here so the requirements below are traceable to specific failures:

1. **`ThemeProvider` does not listen to VS Code theme changes.** `shared/components/src/ThemeProvider/ThemeProvider.tsx:76-87` only subscribes to the OS `prefers-color-scheme` media query. It never observes VS Code's `--vscode-*` CSS variables or the `vscode-light` / `vscode-dark` / `vscode-high-contrast` body class mutations that VS Code uses to signal theme changes.
2. **`setupVSCodeThemeSync()` exists but has zero callers.** The correct subscription implementation (MutationObserver on `document.documentElement` `style`/`class` plus a `vscode-theme-changed` message listener) is defined at `shared/components/src/ThemeProvider/vsCodeAdapter.ts:147-182`, but no webview entry calls it.
3. **Most webview entries don't wrap their root in `ThemeProvider` at all.** Only `apps/vscode/src/webview/web/storyboardPanel.tsx:135` uses it. The other six entries (`logPanel.tsx`, `activityPanel.tsx`, `mapView.tsx`, `resultsPanel.tsx`, `timeController.tsx`, `catalogOverview.tsx`) mount React without a theme context, so `[data-theme]` is never set on the root and `--debrief-*` tokens are never produced.

A fourth, related defect concerns the development environment:

4. **Storybook does not inject `--vscode-*` variables.** Components that style themselves with `var(--vscode-sideBar-background, #252526)` always fall through to the hardcoded dark fallback in Storybook regardless of the theme toolbar selection. A static map keyed by theme variant has already been designed in `specs/209-logpanel-a11y-audit/research.md` but is unused.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Theme Changes Apply Immediately Across All Panels (Priority: P1)

A developer switches from VS Code's default dark theme to a light theme. Every open Debrief panel — the map, layers, activity log, results, time controller, storyboard, and catalogue views — immediately updates its colours, backgrounds, and text to match the new theme. No panel reload or restart is required.

**Why this priority**: Broken theme responsiveness is a first-impression defect. Panels that render with wrong colours in the user's chosen theme look unpolished and undermine trust. This is the primary symptom the user reported.

**Independent Test**: Open any Debrief webview panel in VS Code with a dark theme active, switch to a light theme (or vice versa) via the VS Code command palette, and observe that all visible panels update within one second without a page reload.

**Acceptance Scenarios**:

1. **Given** VS Code is set to a dark theme and a Debrief panel is open, **When** the user changes VS Code's colour theme to a light variant, **Then** the panel's background, text, borders, and interactive elements all adopt the light-theme palette within 1 second.
2. **Given** VS Code is set to a light theme and multiple Debrief panels are open simultaneously, **When** the user switches to a high-contrast dark theme, **Then** all open panels update to use high-contrast colours without requiring any manual action.
3. **Given** a Debrief panel is opened for the first time, **When** VS Code's active theme is dark, **Then** the panel renders with dark-theme colours immediately on load.

---

### User Story 2 - Consistent Visual Language Across All Theme Variants (Priority: P2)

A user compares Debrief panels side-by-side in light mode. All panels share the same colour vocabulary — backgrounds, borders, hover states, and selection highlights are visually consistent across the map, layers, results, and time-controller panels.

**Why this priority**: Inconsistency between panels in the same theme (e.g., one panel with a white background and another with a grey background) breaks the sense of a cohesive product. This is distinct from theme-switching (P1); here the concern is visual harmony within a single theme session.

**Independent Test**: Open all Debrief panels in a single VS Code window with a light theme, take a visual snapshot, and verify that background colours, text colours, and border colours match across panels.

**Acceptance Scenarios**:

1. **Given** VS Code is in light mode, **When** the user opens any Debrief panel, **Then** the panel's background matches the VS Code sidebar/editor background colour, not a hardcoded white.
2. **Given** VS Code is in dark mode, **When** the user opens any Debrief panel, **Then** all panels use a consistent dark background and light text.
3. **Given** the user opens the layers panel and the results panel side by side, **When** in any VS Code theme, **Then** both panels' borders and interactive element colours are visually identical.

---

### User Story 3 - Storybook Theme Preview (Priority: P3)

A developer working on a Debrief component opens Storybook and can preview the component in VS Code light, dark, and high-contrast themes from a single interface. All theme variants are visually correct and ready to screenshot for review.

**Why this priority**: Developer confidence in theme correctness depends on having a reliable preview environment. Without a working Storybook theme switcher, visual regressions in any theme go undetected until the extension is loaded in VS Code.

**Independent Test**: Open Storybook, switch the global theme selector to "Dark" and then "VS Code High Contrast", and verify that all stories render visually distinct from the light theme with no hardcoded colours leaking through.

**Acceptance Scenarios**:

1. **Given** a component story is open in Storybook, **When** the user switches the global theme from "Light" to "Dark", **Then** the component's colours update to reflect the dark theme palette.
2. **Given** the Storybook theme is set to "VS Code", **When** a component is rendered, **Then** it uses the VS Code dark colour tokens rather than generic light/dark defaults.
3. **Given** a new component is added to Storybook, **When** it is wrapped in the ThemeProvider decorator (the default for all stories), **Then** it automatically responds to theme changes without additional configuration.

---

### Edge Cases

- What happens when a VS Code theme uses a non-standard colour (e.g., a community theme with a warm-sepia background)? The panel must adopt the actual colour rather than falling back to hardcoded defaults.
- What happens when the user rapidly cycles through multiple themes? Panels must settle on the final theme without flickering artefacts from intermediate states.
- What happens when a panel is opened while VS Code is loading its theme? The panel must not render with a white flash before the correct theme colours arrive.
- What happens with high-contrast themes on Windows? The panel must respect the high-contrast palette and not override system accessibility colours.
- What happens when a component renders inside a webview that already inherits VS Code CSS variables? The theme system must not fight with or duplicate the inherited variables.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All Debrief webview panels MUST reflect the VS Code active colour theme (light, dark, high-contrast) on initial load.
- **FR-002**: All Debrief webview panels MUST update their colours within 1 second when the VS Code active colour theme changes, without requiring a panel reload.
- **FR-003**: The colour system MUST derive its values from VS Code's own theme tokens rather than using hardcoded colour values, so that any installed VS Code theme is supported — not just the built-in light and dark themes.
- **FR-004**: All panels that share the same VS Code theme MUST present a visually consistent colour palette (same background, text, border, hover, and selection colours).
- **FR-005**: The Storybook development environment MUST provide a theme switcher that accurately simulates VS Code light, dark, and high-contrast modes, so developers can verify theme correctness without launching the VS Code extension.
- **FR-006**: Theme responsiveness MUST cover all interactive states: default, hover, focused, active/selected, and disabled.
- **FR-007**: The solution MUST NOT require developers to add per-component theme wiring; wrapping a component at the application root MUST be sufficient for the entire component tree to receive correct theme colours.
- **FR-008**: High-contrast accessibility themes MUST be treated as a first-class variant, not mapped to the generic dark theme. The shared theme variant model MUST distinguish high-contrast variants from regular dark/light variants so a component can adjust contrast-sensitive styling (focus rings, borders, selection indicators) without inferring it from colour values. *[NEEDS CLARIFICATION: should the variant union expose `light`, `dark`, `light-high-contrast`, `dark-high-contrast`, or a separate `contrast: 'normal' | 'high'` axis? Today `ThemeVariant` is `'light' | 'dark' | 'vscode' | 'system'` and has no high-contrast representation.]*
- **FR-009**: Every Debrief webview entry point MUST wrap its rendered React tree in the shared `ThemeProvider` so that theme tokens, the `[data-theme]` root attribute, and theme context are available to every descendant component. No webview may render its root component without a `ThemeProvider` ancestor.
- **FR-010**: Every Debrief webview entry point MUST subscribe to VS Code theme change notifications for the lifetime of the webview, so that user-initiated theme changes in VS Code propagate to the React tree without requiring the panel to reload. The subscription MUST cover both class/attribute mutations on the webview's root element and any extension-host messages that signal a theme change.
- **FR-011**: The Storybook development environment MUST populate `--vscode-*` CSS variables for the selected theme variant, so that components using `var(--vscode-..., fallback)` render with the correct theme-derived colour rather than the hardcoded fallback. The variable values MUST be supplied by a single shared source so a new component does not need its own variable list.

### Key Entities

- **VS Code Colour Theme**: The theme active in the user's VS Code window (light, dark, light-high-contrast, dark-high-contrast). The authoritative source of truth for what colours to display.
- **Webview Panel**: A Debrief UI rendered inside a VS Code webview (map, layers, activity, results, time controller, storyboard, catalogue). Each panel is a separate browser-like environment that receives VS Code CSS variables automatically.
- **Theme Token**: A named design value (e.g., "primary background", "border colour") that maps to a specific colour for each VS Code theme variant. The bridge between VS Code's raw colour variables and component styling.
- **ThemeProvider**: The React component that distributes the current theme token values to all child components. Must be present at the root of every webview panel and must subscribe to a Theme Change Source so it re-renders descendants when VS Code's theme changes.
- **Theme Change Source**: The mechanism by which the running webview is notified that VS Code's active theme has changed. Encompasses both DOM-level signals (class/style mutations on the webview root) and message-channel signals from the extension host. The webview entry point is responsible for wiring this source into the ThemeProvider.
- **Theme Variant**: A first-class enumeration covering all themes the product must support: at minimum `light`, `dark`, and the high-contrast accessibility variants. The exact shape is an open clarification (FR-008).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every Debrief webview panel updates its colour scheme within 1 second of a VS Code theme change with no user interaction required.
- **SC-002**: Zero hardcoded colour values remain in component CSS that conflict with VS Code theme tokens — all colour properties reference theme-derived values.
- **SC-003**: Visual comparison screenshots (captured by automated tests) show no visible colour mismatch between any two panels rendered in the same VS Code theme.
- **SC-004**: Storybook stories for all components render correctly in all three theme modes (light, dark, VS Code) with no component showing a purely white or black background that doesn't match the selected theme.
- **SC-005**: High-contrast theme variants pass WCAG 2.1 AA contrast ratio requirements (minimum 4.5:1 for normal text, 3:1 for large text), verified by automated accessibility checks.
- **SC-006**: The theme switch round-trip (dark → light → dark) produces no visual artefacts or intermediate states that persist longer than 200ms.
- **SC-007**: 100% of Debrief webview entry points render their root React tree under a `ThemeProvider`, verified by a static check that scans the webview entry directory and fails when any entry mounts React without a ThemeProvider ancestor.
- **SC-008**: 100% of Debrief webview entry points subscribe to VS Code theme changes, verified by an integration test that simulates a VS Code theme change and asserts that every open webview's resolved theme variant updates within 1 second.
- **SC-009**: Storybook stories using `var(--vscode-...)` colour variables render with the correct theme-derived colour in light, dark, and high-contrast theme selections, verified by visual snapshots that compare each variant against the hardcoded-fallback rendering.
