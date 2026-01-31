# Feature Specification: vscrui Component and Theme Library Conversion

**Feature Branch**: `046-vscrui-conversion`
**Created**: 2026-01-31
**Status**: Draft
**Input**: User description: "docs/045-vscrui-conversion-srd.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent Component Appearance Across Themes (Priority: P1)

A developer working on the FeatureList and LayersToolbar components needs all interactive elements (buttons, checkboxes, text fields, dropdowns) to render with the platform's native look and feel across Light, Dark, and VS Code theme variants. Currently, raw HTML elements produce inconsistent styling that doesn't match the host environment.

**Why this priority**: Visual consistency is the primary user-facing value of this conversion. Without it, the application feels disjointed and unprofessional in each rendering context.

**Independent Test**: Can be tested by opening the component library in Storybook and switching between Light, Dark, and VS Code themes — all interactive elements should match the selected theme's visual language.

**Acceptance Scenarios**:

1. **Given** a FeatureList rendered in Storybook, **When** the user switches from Light to Dark theme via the toolbar, **Then** all buttons, checkboxes, text fields, and dropdowns update to match the Dark theme styling with no raw-styled remnants.
2. **Given** a LayersToolbar rendered in the VS Code theme variant, **When** the user inspects any interactive element, **Then** it uses the platform's standard component library styling rather than custom raw HTML styling.

---

### User Story 2 - Eliminating Hardcoded Colours for Theme Compliance (Priority: P1)

A designer reviewing the component CSS files needs all colour values to come from the design token system so that theme changes propagate consistently. Currently, 7 hardcoded colour values bypass the token system.

**Why this priority**: Hardcoded colours break theme switching and create maintenance burden. This is tied to P1 because it directly causes visual bugs in non-default themes.

**Independent Test**: Can be tested by running a search across all component CSS files for raw hex, rgb, or rgba values (excluding token definition files) — zero matches expected.

**Acceptance Scenarios**:

1. **Given** component CSS files, **When** searched for raw hex/rgb/rgba colour values, **Then** zero matches are found outside of token definition files.
2. **Given** the token definition file, **When** inspected, **Then** an attention colour token is defined with appropriate values for both light and dark themes.

---

### User Story 3 - Dark Mode Driven by ThemeProvider (Priority: P2)

A developer testing dark mode needs the dark theme to be controlled by the ThemeProvider's theme selector, not by the browser's colour scheme preference media query. Currently, some CSS files use the browser media query which bypasses Storybook's theme switcher.

**Why this priority**: Correct dark mode control is important for development tooling (Storybook) and host platform integration, but is secondary to the core visual consistency work.

**Independent Test**: Can be tested by searching CSS files for browser colour scheme media queries — zero matches expected — and verifying Storybook's theme toolbar controls dark mode correctly.

**Acceptance Scenarios**:

1. **Given** component CSS files, **When** searched for browser colour scheme preference media queries, **Then** zero matches are found.
2. **Given** a component rendered in Storybook with browser set to light mode, **When** the Storybook theme toolbar is set to Dark, **Then** the component renders in dark mode regardless of browser preference.

---

### User Story 4 - Standard Icon Set via Platform Icons (Priority: P2)

A developer maintaining toolbar icons needs to use the standard platform icon set where equivalents exist, replacing inline SVG icons. This reduces maintenance burden and ensures icons match the host platform's visual language.

**Why this priority**: Icon standardisation improves long-term maintainability but doesn't affect core functionality.

**Independent Test**: Can be tested by inspecting toolbar button icons in Storybook and confirming that icons with known platform equivalents (trash, eye, play, search, filter, check-all, check, add, remove) render using the platform icon font rather than inline SVG.

**Acceptance Scenarios**:

1. **Given** a LayersToolbar rendered in Storybook, **When** inspecting the delete button, **Then** it uses the platform's standard "trash" icon rather than inline SVG.
2. **Given** a toolbar button whose icon has no platform equivalent (eraser, paperclip), **When** rendered, **Then** it retains its inline SVG wrapped in the standard button component.

---

### User Story 5 - Multi-Theme Visual Verification Stories (Priority: P3)

A QA reviewer needs component stories that display key components in all three themes side-by-side for quick visual regression checking.

**Why this priority**: Multi-context stories are a developer productivity enhancement, not a user-facing feature.

**Independent Test**: Can be tested by opening the multi-context stories in Storybook and verifying that LayersToolbar and FilterDropdown appear in Light, Dark, and VS Code themes simultaneously.

**Acceptance Scenarios**:

1. **Given** the Storybook component browser, **When** navigating to the multi-context story for LayersToolbar, **Then** three side-by-side renderings appear showing Light, Dark, and VS Code variants.

---

### Edge Cases

- What happens when a component library button variant doesn't support a needed property (e.g., date-time type on a text field)? Fall back to a styled native input using the token system and raise a backlog item for a dedicated component.
- What happens when the platform icon font fails to load? Buttons should remain functional with fallback text or empty icon slots — no broken layout.
- How does the system handle a component that is both a button and a virtualised list item (FeatureRow)? It remains as a styled div with appropriate accessibility role and keyboard support — no conversion to the button component.
- What happens when the component library is used outside the primary host platform (e.g., Electron Loader)? The icon font must be bundled via the package manager, not loaded from a CDN.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All button elements in FeatureList and LayersToolbar components MUST be replaced with the standard component library's Button component using the appropriate appearance variant (primary, secondary, or icon).
- **FR-002**: All text input elements MUST be replaced with the component library's TextField component, preserving placeholder text and change callback behaviour.
- **FR-003**: All checkbox input elements MUST be replaced with the component library's Checkbox component, preserving checked state and change callbacks.
- **FR-004**: The visibility radio group (All / Hidden only / Visible only) MUST be converted to a Dropdown component, as dropdowns are the standard pattern for option selection in the target platform.
- **FR-005**: Date-time inputs MUST either use the component library's TextField with type pass-through or remain as styled native inputs following the token system. A backlog item MUST be raised if a custom date-time component is needed.
- **FR-006**: FeatureRow MUST remain as a div with accessibility role "button", tab index, and keyboard event handlers. It MUST NOT be converted to a Button component.
- **FR-007**: All CSS files for these components MUST use design tokens exclusively — zero raw hex, rgb, or rgba colour values permitted (excluding token definition files).
- **FR-008**: An attention colour token MUST be added to the token definition file with appropriate values for light and dark themes.
- **FR-009**: All browser colour scheme preference media query blocks MUST be removed from component CSS files and replaced with ThemeProvider selector blocks using design tokens.
- **FR-010**: Where platform icon equivalents exist, inline SVG icons MUST be replaced with the platform icon component. Where no equivalent exists, inline SVG MUST be retained within the standard button wrapper.
- **FR-011**: The component library package MUST be added as a dependency and its icon font CSS MUST be imported in the Storybook preview configuration.
- **FR-012**: The icon font MUST be bundled offline via the package manager — no CDN references permitted.
- **FR-013**: All existing component properties, callbacks, and user interactions MUST be preserved after conversion.
- **FR-014**: Keyboard navigation (Tab, Enter, Space, Escape) MUST work identically before and after conversion.
- **FR-015**: Multi-context stories using the side-by-side decorator MUST be added for LayersToolbar and FilterDropdown, showing all three theme variants.
- **FR-016**: The disabled state of buttons MUST be visually indicated through the component library's built-in disabled styling.
- **FR-017**: Dynamic feature kind checkboxes MUST continue to render from the feature kinds data source.

### Key Entities

- **Design Token**: A named CSS custom property with values defined per theme (light, dark, host platform). Used to propagate theme changes to all components.
- **Theme Variant**: One of three visual configurations (Light, Dark, host platform) controlled by the ThemeProvider's data-theme attribute.
- **Platform Icon**: A standard icon from the host platform's icon font, providing named icons for common UI actions (trash, eye, play, search, filter, etc.).

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Convert existing raw HTML components to use the standard component library while maintaining identical user-facing behaviour across all theme variants.
- **Key Decision(s)**:
  1. For the visibility filter (currently radio buttons): use a Dropdown component, as dropdowns are the standard pattern for option groups in the target platform.
  2. For date-time inputs: determine whether the component library's TextField supports type pass-through, or fall back to styled native inputs.
- **Decision Inputs**: The target platform's UI conventions (dropdowns preferred over radio groups in panels), the component library's capabilities, and the existing interaction patterns users are accustomed to.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | FeatureList with toolbar | User clicks a toolbar button (e.g., filter) | FilterDropdown opens, rendered with standard library components |
| 2 | FilterDropdown open | User types in search field, toggles checkboxes, selects visibility option from dropdown | Filters apply to the feature list; all controls use standard library styling |
| 3 | FilterDropdown applied | User clicks outside or presses Escape | Dropdown closes, filtered results displayed in FeatureList |
| 4 | LayersToolbar | User clicks action buttons (delete, show/hide, run) | Actions execute; buttons use standard library icon buttons with platform icons |
| 5 | Theme switch (Storybook) | Developer switches theme via Storybook toolbar | All components re-render in the selected theme with no visual artefacts |

### UI States

- **Empty State**: Components render with standard library styling even when no data is loaded (empty feature list shows placeholder text styled with tokens).
- **Loading State**: Not applicable — components are synchronous renderers of in-memory data.
- **Error State**: Not applicable — this conversion does not introduce new error conditions. Existing error handling is preserved.
- **Success State**: All components render with consistent standard library styling across Light, Dark, and host platform themes. Interactive states (hover, focus, disabled, active) match the platform's native behaviour.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero raw hex, rgb, or rgba colour values exist in component CSS files (excluding token definition files), verified by automated text search.
- **SC-002**: Zero browser colour scheme preference media queries exist in component CSS files, verified by automated text search.
- **SC-003**: 100% of button and input elements in scope are replaced with standard library equivalents (except FeatureRow div), verified by code review.
- **SC-004**: All components render correctly in all three theme variants (Light, Dark, host platform) in the Storybook environment, verified by visual inspection.
- **SC-005**: All existing keyboard navigation paths (Tab, Enter, Space, Escape) continue to work identically, verified by manual testing.
- **SC-006**: All existing component properties and callbacks function identically after conversion, verified by existing test suites passing without modification.
- **SC-007**: Multi-context side-by-side stories exist for at least LayersToolbar and FilterDropdown, verified in Storybook.

## Assumptions

- The standard component library is compatible with the project's build toolchain and can be installed without conflicts.
- The existing ThemeProvider, adapter, and token infrastructure requires no changes beyond adding the new attention colour token.
- The visibility filter conversion from radio buttons to Dropdown will not confuse existing users, as dropdowns are the standard pattern in the target platform.
- Date-time inputs may require a backlog item for a custom component if the standard library's TextField does not support date-time type pass-through.
- The platform icon font is available as a bundled asset via the component library's package.

## Dependencies

- Standard component library package — not currently installed.
- Existing ThemeProvider infrastructure — functional, no changes needed.
- Existing token definition file — needs one new token added.
- Storybook theme toolbar — functional, needs icon font CSS import.

## Out of Scope

- Converting components outside FeatureList and LayersToolbar (other shared components have their own conversion timeline).
- Creating custom components for gaps in the standard library (raise backlog items instead).
- Changing component behaviour or adding new features during conversion.
- Converting the host platform extension webview itself (separate scope).
