# Feature Specification: Review Technical Debt

**Feature Branch**: `172-review-technical-debt`
**Created**: 2026-03-20
**Status**: Draft
**Input**: User description: "Review technical debt: address dependency skew, type duplication, configuration drift, logging hygiene, and other issues identified in the March 2026 technical debt review"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Align Dependency Versions Across Packages (Priority: P1)

As a developer, I want all shared dependencies to use consistent version ranges across the monorepo so that I avoid subtle runtime bugs caused by version mismatches and reduce confusion when upgrading.

**Why this priority**: Dependency skew is the most common source of hard-to-diagnose build and runtime failures. Aligning versions is low-effort with high payoff, and it unblocks other cleanup work.

**Independent Test**: Can be tested by running `pnpm install` and `uv sync` across all workspace members and verifying no conflicting resolutions exist, and that CI passes with the unified versions.

**Acceptance Scenarios**:

1. **Given** the monorepo has multiple packages depending on `@storybook/*`, **When** a developer inspects all `package.json` files, **Then** all `@storybook/*` dependencies use the same version range.
2. **Given** the monorepo has multiple packages depending on `eslint` and `@typescript-eslint/parser`, **When** a developer inspects all `package.json` files, **Then** all use the same version range.
3. **Given** six Python service packages specify `pydantic`, **When** a developer inspects all `pyproject.toml` files, **Then** all use the same minimum version constraint as the root workspace.
4. **Given** two Python packages specify `ruff`, **When** a developer inspects all `pyproject.toml` files, **Then** all use the same minimum version constraint as the root workspace.

---

### User Story 2 - Consolidate Duplicated Type Definitions (Priority: P1)

As a developer, I want a single canonical definition for each shared type (GeoJSONFeature, TimeRange, MCPToolDefinition, Bounds) so that I can import from one place and avoid subtle incompatibilities between independently maintained copies.

**Why this priority**: 25 independent GeoJSONFeature definitions and 4 incompatible TimeRange definitions create real bugs. Consolidation is a prerequisite for safe refactoring and new feature work.

**Independent Test**: Can be tested by searching the codebase for duplicate type names and verifying that only the canonical definition remains, with all other files importing from it.

**Acceptance Scenarios**:

1. **Given** 25 independent `GeoJSONFeature` definitions exist, **When** consolidation is complete, **Then** all production code imports `SafeFeature` from `@debrief/utils` (or equivalent canonical location) and no standalone redefinitions remain.
2. **Given** 4 incompatible `TimeRange` definitions exist, **When** consolidation is complete, **Then** exactly one `TimeRange` definition exists using epoch milliseconds (per decision in feature #132), with converter utilities for other formats.
3. **Given** `MCPToolDefinition` exists in 2 places, **When** consolidation is complete, **Then** exactly one definition exists in the appropriate shared package.
4. **Given** `Bounds` exists in 2 places, **When** consolidation is complete, **Then** exactly one definition exists in the appropriate shared package.

---

### User Story 3 - Fix Python Workspace and Tooling Alignment (Priority: P2)

As a developer, I want all Python services to be correctly registered in the uv workspace and ruff configuration so that `uv sync`, `uv run pytest`, and linting work correctly for every service.

**Why this priority**: Two services (`debrief-tools`, `debrief-session`) exist in the repo and ruff config but are not managed by uv workspaces, meaning they are invisible to dependency resolution and test runners. This is a small fix with outsized reliability impact.

**Independent Test**: Can be tested by running `uv sync` and verifying all services are installed, then running `uv run pytest` and verifying tests for all services are discovered.

**Acceptance Scenarios**:

1. **Given** `debrief-tools` exists in the repo but not in the uv workspace, **When** workspace membership is corrected, **Then** `uv sync` installs `debrief-tools` and `uv run pytest` discovers its tests.
2. **Given** `debrief-session` exists in the repo but not in the uv workspace, **When** workspace membership is corrected, **Then** `uv sync` installs `debrief-session` and `uv run pytest` discovers its tests.
3. **Given** `debrief-cli` is in the uv workspace but not in ruff `known-first-party`, **When** configuration is corrected, **Then** ruff treats `debrief_cli` imports as first-party.

---

### User Story 4 - Unify Configuration and Add Missing Lint Coverage (Priority: P2)

As a developer, I want consistent TypeScript and ESLint configuration across all packages so that code quality standards are uniformly enforced and new contributors don't encounter surprising differences between packages.

**Why this priority**: Missing ESLint configs in 4 packages and inconsistent `module` settings create gaps in code quality enforcement and confusing build behavior.

**Independent Test**: Can be tested by running `pnpm lint` across all packages and verifying no package is skipped, and by checking that `tsconfig.json` `module` settings follow a documented rationale.

**Acceptance Scenarios**:

1. **Given** `shared/config-ts`, `shared/utils`, `apps/web-shell`, and `services/session-state` lack ESLint configuration, **When** ESLint is added, **Then** `pnpm lint` runs linting rules on all four packages.
2. **Given** ESLint configs use mixed formats (`.eslintrc.cjs` vs `.eslintrc.json`), **When** standardisation is complete, **Then** all ESLint configs use the same format.
3. **Given** `apps/vscode` uses `module: ES2022` while other browser targets use `ESNext`, **When** the divergence is reviewed, **Then** either the setting is aligned or the reason for divergence is documented in a code comment and in `docs/project_notes/decisions.md`.

---

### User Story 5 - Add Coverage Thresholds to Untested Services (Priority: P2)

As a developer, I want coverage thresholds configured for `debrief-config` and `debrief-calc` so that test regression is caught automatically and new code maintains quality standards.

**Why this priority**: These two services currently have no coverage enforcement, meaning tests can silently erode. Adding thresholds is a small configuration change that prevents future debt.

**Independent Test**: Can be tested by running the test suite for each service and verifying that coverage is reported and enforcement triggers on threshold violations.

**Acceptance Scenarios**:

1. **Given** `debrief-config` has no coverage threshold, **When** a threshold is configured, **Then** the test runner fails if coverage falls below 80%.
2. **Given** `debrief-calc` has no coverage threshold, **When** a threshold is configured, **Then** the test runner fails if coverage falls below 80%.

---

### User Story 6 - Break Cross-Layer Architectural Violations (Priority: P3)

As a developer, I want service-layer code to import domain types from schema or utility packages rather than from UI component packages so that the dependency graph flows in one direction (shared → services → apps) without cycles.

**Why this priority**: Importing domain types from `@debrief/components` into service code creates a circular dependency risk and couples service logic to UI packaging. This is architecturally important but requires more careful refactoring.

**Independent Test**: Can be tested by verifying that no file under `apps/vscode/src/services/` or `services/` imports from `@debrief/components`, and that the types are available from `@debrief/schemas` or `@debrief/utils`.

**Acceptance Scenarios**:

1. **Given** `calcService.ts` imports `DebriefFeature` from `@debrief/components`, **When** the type is moved, **Then** `calcService.ts` imports from `@debrief/schemas` or `@debrief/utils`.
2. **Given** `sessionManager.ts` imports `TrackFeature` and `ReferenceLocation` from `@debrief/components`, **When** the types are moved, **Then** imports come from a shared non-UI package.
3. **Given** `mcpToolAdapter.ts` imports from `@debrief/components/ToolMatch`, **When** the type is moved, **Then** the import comes from a shared non-UI package.
4. **Given** `apps/web-shell/src/tools/` contains full domain logic implementations, **When** refactoring is complete, **Then** domain logic is in service packages and web-shell delegates to them.

---

### User Story 7 - Update the Technical Debt Assessment Guide (Priority: P3)

As a project maintainer, I want the technical debt assessment guide to reflect current findings so that future audits cover all known categories of debt and do not report already-resolved items as open.

**Why this priority**: An accurate guide ensures future reviews are efficient and comprehensive. Lower priority because it is documentation rather than code improvement.

**Independent Test**: Can be tested by reviewing the guide and confirming it covers all categories identified in the March 2026 review, marks resolved items, and includes new sections for logging, workspace drift, and error boundaries.

**Acceptance Scenarios**:

1. **Given** `@sparticuz/chromium` and `@playwright/test` skew is resolved, **When** the guide is updated, **Then** Section 1 marks these as resolved and lists current `@storybook` and `eslint` skew.
2. **Given** `tsconfig.base.json` now exists, **When** the guide is updated, **Then** Section 2 reflects this and documents the intentional `noUncheckedIndexedAccess` relaxation.
3. **Given** new debt categories were found (logging, workspace drift, error boundaries, deprecated code tracking), **When** the guide is updated, **Then** new sections are added for each.

---

### Edge Cases

- What happens when consolidating a type that has subtly different shapes across packages? Each usage site must be verified for compatibility with the canonical definition; incompatible call sites need migration adapters or code changes.
- How does removing a re-exported type affect downstream consumers? All import paths must be updated atomically within the monorepo; external consumers (if any) need a deprecation notice.
- What if aligning a dependency version causes a breaking change in one package? The version bump must be tested in isolation for that package before being applied across the workspace.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All instances of each shared npm dependency (`@storybook/*`, `eslint`, `@typescript-eslint/parser`, `eslint-plugin-react`, `@types/leaflet`) MUST use the same version range across all `package.json` files in the workspace.
- **FR-002**: All Python service `pyproject.toml` files MUST use the same minimum version for `pydantic` and `ruff` as the root workspace.
- **FR-003**: `GeoJSONFeature` MUST have exactly one canonical definition; all other files MUST import from it.
- **FR-004**: `TimeRange` MUST have exactly one canonical definition using epoch milliseconds, with converter utilities for other formats.
- **FR-005**: `MCPToolDefinition` and `Bounds` MUST each have exactly one canonical definition in a shared package.
- **FR-006**: All Python services in the repository MUST be registered as uv workspace members.
- **FR-007**: All Python service package names MUST be listed in ruff `known-first-party` configuration.
- **FR-008**: All TypeScript packages MUST have an ESLint configuration that extends a shared base.
- **FR-009**: ESLint configuration files MUST use a single consistent format across all packages.
- **FR-010**: `debrief-config` and `debrief-calc` MUST have test coverage thresholds configured at a minimum of 80%.
- **FR-011**: No service-layer code (`apps/*/src/services/`, `services/`) MUST import types from `@debrief/components`; domain types MUST be importable from `@debrief/schemas` or `@debrief/utils`.
- **FR-012**: The technical debt assessment guide MUST be updated to reflect current state, mark resolved items, and include new sections for logging hygiene, workspace membership drift, error boundary coverage, and deprecated code tracking.

### Key Entities

- **Canonical Type**: A single-source-of-truth type definition (e.g., `SafeFeature`, `TimeRange`) that all consumers import rather than redefining locally.
- **Workspace Member**: A Python or TypeScript package that is registered with the monorepo's package manager (uv or pnpm) for dependency resolution, test discovery, and build orchestration.
- **Version Range**: The semver constraint (e.g., `^8.4.0`, `>=2.12.5`) specified for a dependency, which must be consistent across all packages consuming that dependency.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero dependency version range mismatches across the monorepo for any shared dependency (currently 7 mismatched dependencies).
- **SC-002**: Total number of independent `GeoJSONFeature` definitions reduced from 25 to 1.
- **SC-003**: Total number of independent `TimeRange` definitions reduced from 4 to 1.
- **SC-004**: All Python services (currently 3 misaligned) are correctly registered in both uv workspace and ruff configuration.
- **SC-005**: ESLint coverage increased from partial (4 packages missing) to 100% of TypeScript packages.
- **SC-006**: Test coverage thresholds configured for 100% of Python service packages (currently 2 missing).
- **SC-007**: Zero cross-layer imports from `@debrief/components` into service-layer code (currently 4+ violations).
- **SC-008**: Technical debt assessment guide covers all 15 categories identified in the March 2026 review (currently covers 10).
- **SC-009**: All existing CI checks continue to pass after changes (no regressions).
