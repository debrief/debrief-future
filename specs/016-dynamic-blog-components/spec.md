# Feature Specification: Dynamic Blog Component Bundling

**Feature Branch**: `016-dynamic-blog-components`
**Created**: 2026-01-17
**Status**: Draft
**Input**: User description: "Add dynamic component bundling for blog posts - Package Storybook stories as self-contained JS bundles published alongside blog posts. Bundles stored in debrief.github.io at /assets/components/{post-slug}/. Integration with speckit workflow: plan.md template needs Media Components section, implementation produces component bundle artifacts, /publish handles both blog post and component bundles."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Author Includes Interactive Component Demo (Priority: P1)

A blog post author wants to embed an interactive component demo in their "shipped" blog post to showcase the feature they've implemented. Instead of linking to a fragile Storybook URL that may break over time, they include a self-contained component bundle that renders directly in the blog post.

**Why this priority**: This is the core value proposition - enabling interactive demos in blog posts without fragile external dependencies. Without this, the entire feature has no purpose.

**Independent Test**: Can be fully tested by creating a blog post with an embedded component demo and verifying it renders and responds to user interaction on the published GitHub Pages site.

**Acceptance Scenarios**:

1. **Given** a blog post markdown file with component embed markup, **When** the post is published to GitHub Pages, **Then** the interactive component renders in the browser and responds to user input (click, hover, etc.)
2. **Given** a component bundle stored at `/assets/components/{post-slug}/`, **When** a reader loads the blog post, **Then** the component loads without errors and displays correctly
3. **Given** a blog post with multiple component embeds, **When** the post is viewed, **Then** all components render independently without conflicts

---

### User Story 2 - Speckit Workflow Identifies Bundleable Components (Priority: P2)

During the planning phase of a feature, the speckit workflow automatically identifies which Storybook stories should be bundled for the "shipped" blog post. This information is captured in the plan.md so implementation knows what artifacts to produce.

**Why this priority**: This enables systematic capture of media component requirements, ensuring nothing is missed during implementation. It builds on P1 by providing the workflow foundation.

**Independent Test**: Can be fully tested by running `/speckit.plan` on a feature with Storybook stories and verifying the plan.md includes a "Media Components" section listing the stories to bundle.

**Acceptance Scenarios**:

1. **Given** a feature specification with demo-able components, **When** `/speckit.plan` is executed, **Then** plan.md contains a "Media Components" section identifying stories to bundle
2. **Given** a feature with no visual components, **When** `/speckit.plan` is executed, **Then** the "Media Components" section indicates "None identified" or is omitted
3. **Given** multiple Storybook stories for a feature, **When** the plan is created, **Then** each story is listed with its source path and intended bundle name

---

### User Story 3 - Implementation Produces Component Bundles (Priority: P2)

During feature implementation, when "Media Components" are specified in the plan, the implementation workflow produces self-contained JS bundles as artifacts alongside the code changes.

**Why this priority**: This is the production mechanism for bundles. Equal priority to P2 as both workflow stages are needed for end-to-end functionality.

**Independent Test**: Can be fully tested by running `/speckit.implement` on a feature with Media Components specified and verifying JS bundle files are created in the artifacts directory.

**Acceptance Scenarios**:

1. **Given** a plan.md with Media Components specified, **When** `/speckit.implement` completes, **Then** JS bundle files exist at `specs/{feature}/media/components/`
2. **Given** a Storybook story specified for bundling, **When** the bundle is built, **Then** it includes all necessary dependencies (React runtime, component code, styles)
3. **Given** a bundle build failure, **When** the error occurs, **Then** a clear error message indicates which story failed and why

---

### User Story 4 - Publish Skill Deploys Component Bundles (Priority: P3)

When creating a PR for the shipped blog post, the `/publish` skill copies component bundles to the correct location in the target repository alongside the blog post markdown.

**Why this priority**: This completes the workflow but depends on P1-P2 being functional. Lower priority as it's the final delivery step.

**Independent Test**: Can be fully tested by running `/speckit.pr` with component bundles present and verifying the PR to debrief.github.io includes both the blog post and the `/assets/components/{post-slug}/` directory.

**Acceptance Scenarios**:

1. **Given** component bundles in `specs/{feature}/media/components/`, **When** `/speckit.pr` creates a website PR, **Then** bundles are copied to `assets/components/{post-slug}/` in the PR
2. **Given** a blog post with component embed markup, **When** the PR is merged, **Then** the component URLs in the post resolve correctly
3. **Given** no component bundles exist for a feature, **When** `/speckit.pr` runs, **Then** it proceeds normally without attempting to copy non-existent bundles

---

### Edge Cases

- What happens when a component has external dependencies not bundled? The bundle build should fail with a clear error listing missing dependencies.
- What happens when component embed markup references a non-existent bundle? The page should display gracefully (empty div) rather than breaking, with console error for debugging.
- What happens when the same component is embedded multiple times? Each embed should render independently without state conflicts.
- What happens when bundle build takes too long? A timeout should occur with guidance on reducing bundle size or splitting components.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a bundling mechanism that packages Storybook stories into self-contained JS files
- **FR-002**: Bundles MUST include all runtime dependencies needed to render (React, component code, styles)
- **FR-003**: Bundles MUST NOT require external Storybook infrastructure to function
- **FR-004**: Plan template MUST include a "Media Components" section for identifying stories to bundle
- **FR-005**: `/speckit.plan` command MUST populate the Media Components section when demo-able components exist
- **FR-006**: `/speckit.implement` command MUST build component bundles when Media Components are specified
- **FR-007**: Built bundles MUST be stored at `specs/{feature}/media/components/` during implementation
- **FR-008**: `/speckit.pr` command MUST pass component bundle paths to the publish workflow
- **FR-009**: `/publish` command MUST copy component bundles to `assets/components/{post-slug}/` in the target repository
- **FR-010**: Blog post authors MUST be able to embed components using standard HTML snippet: `<div id="{demo-id}"></div><script src="/assets/components/{post-slug}/{bundle}.js"></script>`
- **FR-011**: System MUST support multiple component embeds in a single blog post
- **FR-012**: Bundle build failures MUST produce actionable error messages

### Key Entities

- **Component Bundle**: A self-contained JS file that renders a single interactive component when loaded; identified by bundle name matching the source story
- **Media Components Section**: A plan.md section that maps Storybook story sources to bundle names with purpose descriptions
- **Post Slug**: The URL-safe identifier for a blog post, used to namespace component bundles in the assets directory

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Interactive component demos render correctly in 100% of published blog posts that use the bundling system
- **SC-002**: Component bundle URLs remain stable across repository refactoring (0 broken links after implementation)
- **SC-003**: Bundle files are self-contained with no runtime dependencies on external Storybook infrastructure
- **SC-004**: End-to-end workflow from plan to publish completes without manual intervention for bundle handling
- **SC-005**: Authors can embed components using documented HTML snippet pattern without additional tooling knowledge
- **SC-006**: Components remain interactive in the blog context (respond to user input: click, hover, pan, zoom as applicable)

## Assumptions

- Storybook 8.x is used for component development (CSF3 format)
- Target deployment is GitHub Pages (static hosting only)
- React 18+ is the component framework
- Bundle size is acceptable for blog post loading (typical web performance expectations)
- Authors have access to component source paths when writing blog posts
