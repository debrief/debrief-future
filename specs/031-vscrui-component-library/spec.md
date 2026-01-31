# Feature Specification: Document vscrui as Standard Component Library for VS Code Webviews

**Feature Branch**: `031-vscrui-component-library`
**Created**: 2026-01-30
**Status**: Draft
**Input**: User description: "Document vscrui as standard component library for VS Code webviews"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Discovers vscrui as the Standard Library (Priority: P1)

A developer starting work on a VS Code webview panel (or Electron/Storybook component) reads the shared component library documentation and immediately learns that vscrui is the required UI library. They understand why it was chosen, what it provides, and how to get started.

**Why this priority**: Without clear documentation of the standard, developers will make ad-hoc choices leading to inconsistent UIs that don't match VS Code's native look and feel.

**Independent Test**: Can be tested by having a new contributor read the documentation and correctly identify which library to use, how to install it, and which components are available.

**Acceptance Scenarios**:

1. **Given** a developer new to the project, **When** they open the shared components documentation, **Then** they find a clear statement that vscrui is the standard UI component library for all webview-based UIs.
2. **Given** a developer reading the documentation, **When** they look for installation instructions, **Then** they find the npm package name, installation command, and peer dependencies.
3. **Given** a developer reading the documentation, **When** they look for the rationale, **Then** they find an explanation of why vscrui was chosen over alternatives (replaces deprecated VS Code Webview UI Toolkit, React-based, matches native VS Code styling).

---

### User Story 2 - Developer Understands Component Inventory (Priority: P1)

A developer building a form, panel, or interactive element reads the documentation and finds a categorized inventory of available vscrui components with brief descriptions and usage guidance.

**Why this priority**: Knowing what components exist prevents developers from re-implementing functionality that vscrui already provides.

**Independent Test**: Can be tested by checking the documentation lists all vscrui component categories (form elements, display, layout, interactive, icons) with component names.

**Acceptance Scenarios**:

1. **Given** a developer needs a text input, **When** they consult the component inventory, **Then** they find TextField listed under form elements with a brief description.
2. **Given** a developer needs a tabbed layout, **When** they consult the component inventory, **Then** they find Panels listed under layout components.
3. **Given** a developer needs VS Code icons, **When** they consult the component inventory, **Then** they find Codicon support documented under icons.

---

### User Story 3 - Developer Understands Scope and Constraints (Priority: P2)

A developer understands that vscrui applies to all web-based rendering contexts in the project (VS Code extension webviews, Electron Loader app, Storybook stories) and that components must work offline (bundled, no CDN).

**Why this priority**: Scope clarity prevents confusion about where the standard applies and ensures the offline-first constraint is respected.

**Independent Test**: Can be tested by checking the documentation explicitly lists all applicable contexts and the offline bundling requirement.

**Acceptance Scenarios**:

1. **Given** a developer working on the Electron Loader, **When** they read the scope section, **Then** they confirm vscrui applies to their context.
2. **Given** a developer considering a CDN import, **When** they read the constraints, **Then** they find the offline bundling requirement and understand they must use npm package bundling.

---

### Edge Cases

- What happens if vscrui doesn't provide a needed component? Documentation should state to raise the gap in a backlog item before creating a custom component.
- What about non-React contexts? Documentation should state that all webview UIs use React (per project tech stack), so this is not applicable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Documentation MUST state vscrui as the standard UI component library for all webview-based UIs in the project.
- **FR-002**: Documentation MUST list the npm package name (`vscrui`) and installation command.
- **FR-003**: Documentation MUST list peer dependencies (React 18+).
- **FR-004**: Documentation MUST provide a categorized component inventory:
  - Form elements: TextField, TextArea, Checkbox, Dropdown
  - Display: Badge, Label, Tag, Divider, Loader
  - Layout: Pane, Panels (tabs), Table
  - Interactive: Button (primary, secondary, icon variations)
  - Icons: Codicon support
- **FR-005**: Documentation MUST explain the rationale: replaces deprecated Microsoft VS Code Webview UI Toolkit with a modern React-based alternative.
- **FR-006**: Documentation MUST specify the scope: VS Code extension webviews, Electron Loader app, Storybook stories.
- **FR-007**: Documentation MUST specify the offline constraint: components bundled via npm, no CDN imports.
- **FR-008**: Documentation MUST live in `shared/components/` as part of the shared component library spec.
- **FR-009**: Documentation MUST include a basic usage example showing a vscrui component import and render.
- **FR-010**: Documentation MUST reference the upstream repository (https://github.com/estruyf/vscrui) for full API details.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A markdown document exists at `shared/components/vscrui.md` (or equivalent location within `shared/components/`) documenting vscrui as the standard.
- **SC-002**: The document covers all FR-001 through FR-010 requirements.
- **SC-003**: A new contributor can read the document and correctly answer: "What library do I use for VS Code webview UI components?" without consulting any other source.
- **SC-004**: The document is referenced from the main project documentation (ARCHITECTURE.md or similar) so it is discoverable.
