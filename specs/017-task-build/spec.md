# Feature Specification: Task Build Management

**Feature Branch**: `017-task-build`
**Created**: 2026-01-23
**Status**: Draft
**Input**: User description: "Adopt Task for build management and configure build YAML. Interview me to find my objectives & priorities for build management"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run All Tests with Single Command (Priority: P1)

A developer wants to verify their changes haven't broken anything before committing. They run a single command that executes all Python and TypeScript tests across the monorepo.

**Why this priority**: Testing is the most frequent developer action. Fast, reliable test execution directly impacts productivity and code quality.

**Independent Test**: Can be fully tested by running `task test` and verifying all test suites complete with pass/fail status.

**Acceptance Scenarios**:

1. **Given** a clean checkout, **When** developer runs `task test`, **Then** all Python tests (pytest) and TypeScript tests (vitest, vscode-test) execute and report results
2. **Given** Python tests pass but TypeScript tests fail, **When** developer runs `task test`, **Then** the command exits with non-zero status and shows which suite failed
3. **Given** dependencies are not installed, **When** developer runs `task test`, **Then** dependencies are installed first (via task dependency) before tests run

---

### User Story 2 - Build All Artifacts (Priority: P2)

A developer or CI system needs to build all artifacts (compiled TypeScript, Python packages, VS Code extension) to verify the project builds successfully.

**Why this priority**: Build verification is essential for releases and CI, but less frequent than testing during development.

**Independent Test**: Can be fully tested by running `task build` and verifying all artifacts are created in their expected locations.

**Acceptance Scenarios**:

1. **Given** a clean checkout, **When** developer runs `task build`, **Then** dependencies are installed first (via task dependency) and all artifacts are created
2. **Given** a TypeScript compilation error exists, **When** developer runs `task build`, **Then** the command fails fast with clear error location
3. **Given** builds have already run and source files unchanged, **When** developer runs `task build` again, **Then** cached outputs are used and build completes quickly

---

### User Story 3 - Development Watch Mode (Priority: P2)

A developer wants to work on code with automatic rebuilding when files change, enabling rapid iteration without manual rebuild commands.

**Why this priority**: Watch mode significantly improves development velocity for UI and extension work.

**Independent Test**: Can be fully tested by running `task dev`, modifying a source file, and verifying automatic recompilation occurs.

**Acceptance Scenarios**:

1. **Given** developer runs `task dev`, **When** they modify a TypeScript file, **Then** the affected package recompiles automatically
2. **Given** developer runs `task dev`, **When** they want to stop, **Then** Ctrl+C cleanly terminates all watch processes
3. **Given** a compilation error occurs during watch, **When** developer fixes the error, **Then** recompilation succeeds without restarting watch

---

### User Story 4 - Lint and Auto-Fix Code (Priority: P3)

A developer wants to check code style and automatically fix issues before committing, ensuring consistent code quality across Python and TypeScript.

**Why this priority**: Linting is important for code quality but typically run less frequently than tests.

**Independent Test**: Can be fully tested by introducing a style violation, running `task lint`, then running `task lint:fix` to auto-correct.

**Acceptance Scenarios**:

1. **Given** code with style violations, **When** developer runs `task lint`, **Then** violations are reported with file locations
2. **Given** code with auto-fixable violations, **When** developer runs `task lint:fix`, **Then** violations are automatically corrected
3. **Given** clean code, **When** developer runs `task lint`, **Then** command exits with zero status

---

### User Story 5 - Install All Dependencies (Priority: P3)

A developer cloning the repo for the first time wants to install all dependencies with a single command.

**Why this priority**: First-time setup is important but happens infrequently per developer.

**Independent Test**: Can be fully tested by running `task install` on a fresh checkout and verifying both Python and Node dependencies are installed.

**Acceptance Scenarios**:

1. **Given** a fresh checkout, **When** developer runs `task install`, **Then** both `uv sync` and `pnpm install` complete successfully
2. **Given** dependencies already installed and lockfiles unchanged, **When** developer runs `task install`, **Then** command completes quickly using cached state

---

### Edge Cases

- What happens when Python is not installed or wrong version? Task should check prerequisites and provide clear error message.
- What happens when running on Windows vs macOS vs Linux? Task commands should work cross-platform.
- How does system handle partial failures (e.g., Python tests pass but TypeScript fails)? Should fail fast and report which component failed.
- What happens when uv or pnpm is not installed? Task should detect and provide installation instructions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a `task test` command that runs all Python and TypeScript tests
- **FR-002**: System MUST provide a `task build` command that compiles all artifacts
- **FR-003**: System MUST provide a `task dev` command that starts watch mode for development
- **FR-004**: System MUST provide a `task lint` command that checks code style across both stacks
- **FR-005**: System MUST provide a `task lint:fix` command that auto-fixes style violations
- **FR-006**: System MUST provide a `task install` command that installs all dependencies
- **FR-007**: System MUST skip unchanged targets when source files haven't changed (caching)
- **FR-008**: System MUST work identically in CI and local development environments
- **FR-009**: System MUST replace the existing Makefile as the single source of build commands
- **FR-010**: System MUST provide clear error messages when prerequisites (Python, Node, uv, pnpm) are missing
- **FR-011**: System MUST automatically run `install` before `test` and `build` if dependencies are missing (task dependencies)

### Key Entities

- **Taskfile.yml**: Central configuration file defining all build tasks, dependencies, and caching rules
- **Task Target**: A named command (e.g., `test`, `build`) with optional dependencies and caching configuration
- **Source Group**: A collection of files used for cache invalidation (e.g., all Python files, all TypeScript files)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can run all tests with a single command (`task test`) completing in under 2 minutes for a warm cache
- **SC-002**: Repeated builds with no source changes complete in under 5 seconds (cache hit)
- **SC-003**: New developers can set up the project with `task install` in under 3 minutes
- **SC-004**: CI pipeline uses identical task commands as local development (no CI-specific scripts)
- **SC-005**: All existing Makefile functionality is available via Task commands (full replacement)
- **SC-006**: Task commands work on macOS, Linux, and Windows without modification

## Assumptions

- Task (taskfile.dev) binary will be installed as a project prerequisite
- Python 3.11+ with uv is available on developer machines
- Node.js 18+ with pnpm is available on developer machines
- Existing test configurations (pytest, vitest, vscode-test) remain unchanged
- GitHub Actions CI will install Task via official action

## Out of Scope

- Containerized builds (Earthly/Docker) - may be added later
- Remote caching or distributed builds
- Custom Task plugins or extensions
- Migration scripts for existing Makefile users (documentation only)
