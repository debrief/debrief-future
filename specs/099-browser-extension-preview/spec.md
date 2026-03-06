# Feature Specification: Browser-Based VS Code Extension Preview

**Feature Branch**: `099-browser-extension-preview`
**Created**: 2026-02-19
**Status**: Draft
**Input**: User description: "I want to be able to review the vs-code extension using my browser. One way to do this, is to have PR previews in Heroku. In the Heroku instance we'd host a 'code-server' instance, which loads our vs-code extension. I can then browse to the Heroku URL, and review new features within the vs-code instance. You will need me to step in and configure the Heroku PR preview. So, break the work down into 2 tasks - one before the Heroku config, and one for after."

## Overview

Enable reviewers to test and preview the Debrief VS Code extension directly in a web browser by running code-server on Heroku with Review Apps. Each pull request automatically spins up a preview environment where reviewers can interact with the extension without installing anything locally.

The work is split into two explicit phases:

- **Phase 1 (Before Heroku Config)**: Everything the development team prepares — container setup, extension packaging, sample data, CI packaging, and Heroku deployment descriptors.
- **Phase 2 (After Heroku Config)**: After the repository owner manually configures Heroku Review Apps via the Heroku Dashboard, validate the end-to-end workflow and add review guidance.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prepare Preview Environment Artifacts (Priority: P1)

As a developer, I prepare all the files needed to run the VS Code extension inside code-server on Heroku, so that once Heroku Review Apps are enabled, PR previews work automatically.

**Why this priority**: Nothing else can proceed until the container definition, extension packaging, and Heroku deployment descriptors are in place. This is the foundation for the entire preview capability.

**Independent Test**: Can be fully tested by building the container image locally, launching it, navigating to the code-server URL in a browser, and confirming the Debrief extension is loaded with sample data.

**Acceptance Scenarios**:

1. **Given** the repository contains the preview container definition, **When** a developer builds and runs the container locally, **Then** code-server starts and is accessible in a browser on the configured port.
2. **Given** the container is running, **When** a reviewer opens code-server in the browser, **Then** the Debrief VS Code extension is pre-installed and active.
3. **Given** the extension is loaded, **When** the reviewer opens the sample workspace, **Then** sample STAC data and REP files are available for exploration.
4. **Given** the repository contains an `app.json` and `Dockerfile` for Heroku, **When** CI runs on a PR, **Then** the extension `.vsix` package is built and included in the container image.

---

### User Story 2 - Review Extension in Browser via PR Preview (Priority: P2)

As a reviewer, I click a link on a pull request and am taken to a browser-based VS Code environment where I can interact with the new or changed extension features.

**Why this priority**: This is the primary user-facing value — the ability to review extension changes without a local setup. It depends on Phase 1 artifacts being complete and Heroku Review Apps being configured.

**Independent Test**: Can be tested by opening a PR, waiting for the Heroku Review App to deploy, navigating to the preview URL, and exercising the extension features.

**Acceptance Scenarios**:

1. **Given** Heroku Review Apps are configured (by the repo owner) and a PR is opened, **When** Heroku deploys the review app, **Then** a unique preview URL is available and linked from the PR.
2. **Given** a reviewer navigates to the preview URL, **When** code-server loads, **Then** the VS Code interface appears with the Debrief extension installed from the PR branch build.
3. **Given** the reviewer is in the preview environment, **When** they open sample data files, **Then** the Debrief map view, STAC explorer, and other extension features function correctly.
4. **Given** a PR is closed or merged, **When** Heroku processes the event, **Then** the review app is automatically shut down.

---

### User Story 3 - Reviewer Guidance and Onboarding (Priority: P3)

As a reviewer unfamiliar with the extension, I see clear instructions in the PR description and the preview environment on what to test and how to navigate the extension.

**Why this priority**: Improves review quality by guiding reviewers through the extension features. Lower priority because the preview itself is functional without it.

**Independent Test**: Can be tested by verifying the PR template includes review instructions and the preview environment displays a welcome/getting-started page.

**Acceptance Scenarios**:

1. **Given** a PR is created with extension changes, **When** the PR template is used, **Then** the description includes a "Preview Review" section with a link to the preview URL and testing instructions.
2. **Given** a reviewer opens the preview environment, **When** code-server finishes loading, **Then** a README or welcome document is open by default explaining how to exercise the extension features.

---

### Edge Cases

- What happens when the extension fails to build during CI? The preview environment should still deploy with code-server but display a clear error indicating the extension was not installed.
- What happens when Heroku Review Apps are not yet configured? Phase 1 artifacts should still pass CI validation and work for local container testing.
- What happens when sample data files are missing or corrupted? Code-server should still load; the extension should show an appropriate empty state.
- What happens if a reviewer opens the preview URL before the deployment finishes? They should see a Heroku-standard "app is deploying" page.

## Requirements *(mandatory)*

### Functional Requirements

#### Phase 1 — Before Heroku Config

- **FR-001**: Repository MUST contain a container definition that runs code-server with the Debrief VS Code extension pre-installed.
- **FR-002**: The container MUST include sample STAC catalog data and REP files so reviewers can exercise extension features immediately.
- **FR-003**: The CI pipeline MUST build the extension as a `.vsix` package on every PR.
- **FR-004**: Repository MUST contain a Heroku `app.json` descriptor that defines the review app configuration (environment variables, build steps, add-ons).
- **FR-005**: The container definition MUST be compatible with Heroku's container deployment model (listening on `$PORT`, appropriate process type).
- **FR-006**: The preview container MUST be testable locally — a developer MUST be able to build and run it without Heroku.
- **FR-007**: The container MUST configure code-server to open a default workspace containing the sample data on startup.

#### Phase 2 — After Heroku Config

- **FR-008**: After the repository owner enables Heroku Review Apps, each new PR MUST automatically trigger a preview deployment.
- **FR-009**: The preview environment MUST serve the extension built from the PR branch, not from main.
- **FR-010**: The PR template MUST include a section for the preview URL and basic review instructions.
- **FR-011**: A welcome document MUST be displayed by default in the preview environment, guiding the reviewer through available features and sample data.
- **FR-012**: The preview environment MUST tear down automatically when the PR is closed or merged.

### Key Entities

- **Preview Container**: The container image running code-server with the Debrief extension and sample data. Built per-PR.
- **Extension Package (.vsix)**: The packaged VS Code extension artifact produced by CI, installed into code-server.
- **Sample Workspace**: A pre-configured workspace with STAC catalogs and REP files for reviewers to explore.
- **Heroku Review App**: An ephemeral Heroku application created per-PR, serving the preview container.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Review and interact with VS Code extension changes in a browser without any local setup.
- **Key Decision(s)**:
  1. Which extension features to test based on the PR changes.
  2. Whether the extension behaviour is correct and the PR should be approved.
- **Decision Inputs**: PR description with change summary, preview environment with sample data pre-loaded, welcome document with testing guidance.

### Screen Progression

| Step | Screen/State              | User Action                             | Result                                                   |
|------|---------------------------|-----------------------------------------|----------------------------------------------------------|
| 1    | GitHub PR page            | Click preview URL in PR description     | Browser navigates to Heroku review app URL               |
| 2    | Code-server loading       | Wait for environment to initialize      | VS Code interface appears with Debrief extension active  |
| 3    | Welcome document          | Read review instructions                | Reviewer understands what features to test                |
| 4    | VS Code with sample data  | Open sample files, interact with extension | Extension features (map, STAC explorer) function in browser |
| 5    | Review complete           | Return to GitHub PR                     | Reviewer leaves approval or requests changes             |

### UI States

- **Empty State**: Code-server loads but extension is not installed (build failure) — a notice file explains the issue and suggests checking CI logs.
- **Loading State**: Heroku's standard deployment progress page while the review app container starts.
- **Error State**: If the container fails to start, Heroku displays its standard error page. Reviewer is directed to check the PR's CI status.
- **Success State**: Code-server is fully loaded with the Debrief extension active, sample workspace open, and welcome document visible.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reviewer can go from clicking the preview link to interacting with the extension in under 2 minutes (after initial container build).
- **SC-002**: The preview container can be built and run locally by a developer with a single command.
- **SC-003**: 100% of PRs with extension changes receive an automatic preview deployment (once Heroku Review Apps are enabled).
- **SC-004**: The preview environment displays all core extension features (STAC explorer, map view, sample data) without errors.
- **SC-005**: Preview environments are automatically removed within 1 hour of PR closure or merge.

## Assumptions

- Heroku Review Apps is the chosen platform; the repository owner will configure this manually via the Heroku Dashboard between Phase 1 and Phase 2.
- code-server (the open-source VS Code in the browser project) is the mechanism for serving VS Code in the browser; no licensing issues apply.
- The existing CI pipeline can be extended to produce `.vsix` packages as build artifacts.
- Sample data already exists in the repository (under `demo/samples/`) or can be reused from the demo environment.
- The Debrief VS Code extension is compatible with code-server (which uses the Open VSX marketplace model rather than the VS Code Marketplace).
- Heroku's container stack is used (not buildpacks), allowing full control over the runtime environment.

## Dependencies

- Heroku account with Review Apps capability (manual configuration step by repo owner).
- code-server open-source project for browser-based VS Code.
- Existing CI pipeline for building the VS Code extension.
- Sample STAC/REP data from the `demo/samples/` directory.

## Phase Boundary

The explicit handoff between Phase 1 and Phase 2 is:

> **Phase 1 complete** → Developer confirms the container builds locally, CI packages the `.vsix`, and Heroku descriptors (`app.json`, `Dockerfile`) are committed.
>
> **Manual step** → Repository owner configures Heroku Review Apps via the Heroku Dashboard (connects repo, enables review apps for PRs).
>
> **Phase 2 begins** → Validate end-to-end flow, add PR template guidance, create welcome document, confirm auto-teardown.
