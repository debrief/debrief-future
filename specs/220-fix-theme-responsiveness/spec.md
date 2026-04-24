# Feature Specification: VS Code Theme Responsiveness

**Feature Branch**: `220-fix-theme-responsiveness`
**Created**: 2026-04-22
**Status**: Draft
**Input**: User description: "VS Code styled components do not properly react to light/dark theme settings. Fix theme responsiveness as part of 209."

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
- **FR-008**: High-contrast accessibility themes MUST be treated as a first-class variant, not mapped to the generic dark theme.

### Key Entities

- **VS Code Colour Theme**: The theme active in the user's VS Code window (light, dark, light-high-contrast, dark-high-contrast). The authoritative source of truth for what colours to display.
- **Webview Panel**: A Debrief UI rendered inside a VS Code webview (map, layers, activity, results, time controller, storyboard, catalogue). Each panel is a separate browser-like environment that receives VS Code CSS variables automatically.
- **Theme Token**: A named design value (e.g., "primary background", "border colour") that maps to a specific colour for each VS Code theme variant. The bridge between VS Code's raw colour variables and component styling.
- **ThemeProvider**: The React component that distributes the current theme token values to all child components. Must be present at the root of every webview panel.
- **Theme Variant**: One of: `light`, `dark`, `high-contrast-light`, `high-contrast-dark` (or a pass-through mode that reads live from VS Code's own CSS variables).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every Debrief webview panel updates its colour scheme within 1 second of a VS Code theme change with no user interaction required.
- **SC-002**: Zero hardcoded colour values remain in component CSS that conflict with VS Code theme tokens — all colour properties reference theme-derived values.
- **SC-003**: Visual comparison screenshots (captured by automated tests) show no visible colour mismatch between any two panels rendered in the same VS Code theme.
- **SC-004**: Storybook stories for all components render correctly in all three theme modes (light, dark, VS Code) with no component showing a purely white or black background that doesn't match the selected theme.
- **SC-005**: High-contrast theme variants pass WCAG 2.1 AA contrast ratio requirements (minimum 4.5:1 for normal text, 3:1 for large text), verified by automated accessibility checks.
- **SC-006**: The theme switch round-trip (dark → light → dark) produces no visual artefacts or intermediate states that persist longer than 200ms.
