# Feature Specification: VS Code Multi-Root Workspace Configuration

**Feature Branch**: `018-vscode-workspace-config`
**Created**: 2026-01-21
**Status**: Draft
**Input**: User description: "Add VS Code multi-root workspace configuration. Create a .code-workspace file that defines the repo as a multi-root workspace with logical folder groupings, includes recommended VS Code extensions, and provides documentation explaining how/when to modify the workspace file."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open Project with Workspace Awareness (Priority: P1)

A developer clones the Debrief repository and wants to work with proper workspace-aware features. They open the workspace file and VS Code recognizes all project folders with appropriate separation between Python services, TypeScript apps, schemas, and documentation.

**Why this priority**: This is the core functionality - without proper workspace recognition, developers get a flat folder view with no logical grouping, making navigation difficult in this monorepo.

**Independent Test**: Can be fully tested by opening the .code-workspace file in VS Code and verifying all folders appear with their logical names and the workspace loads without errors.

**Acceptance Scenarios**:

1. **Given** a freshly cloned repository, **When** developer opens the .code-workspace file, **Then** VS Code opens with all project folders visible in the Explorer sidebar
2. **Given** the workspace is open, **When** developer views the Explorer, **Then** folders are organized by logical grouping (services, apps, shared, docs, etc.)
3. **Given** the workspace is open, **When** developer searches for files, **Then** search respects workspace boundaries and shows results from all included folders

---

### User Story 2 - Get Extension Recommendations (Priority: P2)

A new developer opens the workspace and receives recommendations for useful extensions specific to this project, including Python, TypeScript, LinkML, and code quality tools.

**Why this priority**: Extension recommendations help onboard new developers faster by suggesting the right tools, but developers can still work without them.

**Independent Test**: Can be fully tested by opening the workspace in a fresh VS Code installation and verifying extension recommendation prompts appear.

**Acceptance Scenarios**:

1. **Given** a VS Code installation without project extensions, **When** developer opens the workspace, **Then** VS Code prompts to install recommended extensions
2. **Given** the workspace is open, **When** developer views "Extensions: Show Recommended Extensions", **Then** all project-relevant extensions are listed
3. **Given** extensions are installed, **When** developer works on Python files, **Then** Python-specific features (linting, formatting) work correctly

---

### User Story 3 - Understand When to Update Workspace (Priority: P3)

A developer adds a new service package to the repository and needs to know whether and how to update the workspace configuration.

**Why this priority**: Documentation prevents workspace configuration drift and helps maintain consistency, but the workspace will still function if slightly out of date.

**Independent Test**: Can be fully tested by reading the documentation and following the instructions to add a hypothetical new folder.

**Acceptance Scenarios**:

1. **Given** the workspace file exists, **When** developer looks for update guidance, **Then** clear documentation explains when workspace changes are needed
2. **Given** documentation exists, **When** developer reads update instructions, **Then** they understand the process without needing external help
3. **Given** a new top-level folder is added, **When** developer follows documentation, **Then** they can successfully add it to the workspace

---

### Edge Cases

- What happens when a folder listed in the workspace file is deleted from the repository? VS Code displays a warning but continues to function with remaining folders.
- How does the system handle developers who prefer single-folder mode? They can continue opening the root folder directly without using the workspace file.
- What happens if a developer opens both the workspace and root folder simultaneously? Standard VS Code behavior applies - they operate as separate windows.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Repository MUST contain a `.code-workspace` file at the root level
- **FR-002**: Workspace file MUST include all existing top-level code directories: `apps/`, `demo/`, `docs/`, `services/`, `shared/`, `specs/`, `tests/`
- **FR-003**: Workspace file MUST include recommended extensions for: Python development, TypeScript development, LinkML schemas, and code quality (Ruff)
- **FR-004**: Repository MUST contain documentation explaining when and how to update the workspace file
- **FR-005**: Existing `.vscode/settings.json` MUST be preserved (contains Peacock color customizations)
- **FR-006**: Workspace configuration MUST work offline without requiring network access
- **FR-007**: Each folder in the workspace MUST have a descriptive display name that indicates its purpose

### Key Entities

- **Workspace File**: Configuration file defining multi-root workspace structure, folder paths, display names, and extension recommendations
- **Extension Recommendation**: Identifier for a VS Code extension that benefits project development
- **Folder Entry**: Reference to a project directory with optional display name override

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can open the workspace file and see all 7 project folders within 5 seconds of VS Code launch
- **SC-002**: 100% of required extensions (Python, TypeScript, LinkML, Ruff) appear in the recommendations list
- **SC-003**: New developers can follow documentation to add a folder to the workspace in under 5 minutes without assistance
- **SC-004**: Workspace opens successfully on both fresh VS Code installations and existing developer setups
- **SC-005**: No functionality is lost compared to opening the repository as a single folder

## Scope *(mandatory)*

### In Scope

- Creating the `.code-workspace` file with folder entries and extension recommendations
- Documentation for maintaining the workspace file
- Logical naming for workspace folders

### Out of Scope

- Per-folder custom settings (keep initial version simple)
- Launch configurations for debugging
- Debug configurations
- Task definitions
- Workspace-level settings beyond folder structure

## Assumptions

- Developers use VS Code as their primary editor for this project
- The current folder structure (apps, demo, docs, services, shared, specs, tests) represents the intended project organization
- Extension recommendations will use marketplace extension identifiers
- Developers understand basic VS Code workspace concepts

## Dependencies

- None - this feature is self-contained configuration
