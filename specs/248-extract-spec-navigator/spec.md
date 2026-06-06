# Feature Specification: Extract spec-navigator into a Standalone Repository

**Feature Branch**: `248-extract-spec-navigator`
**Created**: 2026-05-08
**Status**: Draft
**Input**: User description: "Extract spec-navigator from apps/spec-navigator/ into a standalone repository so it can be reused by other projects. Phase 1: introduce config seam in this repo. Phase 2: subtree split to new repo, stand up CI/hosting/secrets. Phase 3: cutover — delete from debrief-future, point at hosted instance."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — De-couple spec-navigator from debrief in place (Priority: P1)

A debrief-future maintainer wants spec-navigator to stop assuming it lives in debrief-future. Today the app has hardcoded references to the debrief org, debrief-future repo slug, debrief-future label conventions, and the project's specific spec-directory layout. The maintainer introduces a configuration seam — one place that holds the target repo slug, the spec-path glob, the artefact filenames, and the label/status map — and replaces every hardcoded debrief literal with a read from that configuration. The default values reproduce today's behaviour exactly, so nothing visible changes.

**Why this priority**: Nothing else can happen until this lands. It is the gating step for extraction, and it delivers standalone value (cleaner code, reusable shape) even if the team decided not to extract. It also de-risks Phase 2 by surfacing every coupling before the move.

**Independent Test**: Without performing any extraction, point the configuration at a *different* GitHub repo's specs directory and confirm the app renders that repo's specs correctly. Reverting to the default configuration must reproduce the current debrief-future experience byte-for-byte.

**Acceptance Scenarios**:

1. **Given** the spec-navigator source contains hardcoded debrief identifiers, **When** Phase 1 lands, **Then** the audit-identified hardcoded literals are gone from `src/` and the configuration object holds their values.
2. **Given** Phase 1 has landed with default configuration, **When** a user loads the running app, **Then** every behaviour observable today (spec list, artefact rendering, navigation, search, evidence display, link rewriting) is unchanged.
3. **Given** Phase 1 has landed, **When** a developer changes the configuration to point at an unrelated public GitHub repo with a `specs/` directory, **Then** the app renders that repo's specs without any source code changes.
4. **Given** Phase 1 has landed, **When** the existing Vitest and Playwright suites run against the default configuration, **Then** all tests pass.

---

### User Story 2 — Extract to a standalone, independently buildable repository (Priority: P2)

A maintainer wants spec-navigator to live in its own GitHub repository with its own CI, its own hosting, and its own release cadence. They use a history-preserving extraction (subtree split) so commit dates, authors, and per-file blame remain meaningful. They stand up a CI pipeline that runs lint, typecheck, unit tests, and end-to-end tests, and a hosting target that publishes a built bundle to a stable URL on every merge to main. Contributors who do not belong to the debrief organisation can clone, install, and run the full non-live test suite without any debrief-issued secret.

**Why this priority**: This is the core deliverable. It depends on Phase 1 (configuration seam) and unlocks Phase 3 (cutover). Until this phase succeeds, debrief-future cannot stop hosting the app itself.

**Independent Test**: An engineer who has never used debrief-future clones the new repository, runs the documented install + test commands, and observes a green build. They open the published URL on a clean browser session and successfully load the configured target repo's specs.

**Acceptance Scenarios**:

1. **Given** the new repository exists, **When** the maintainer inspects its git history, **Then** every commit that touched `apps/spec-navigator/` in debrief-future is present with its original author and date.
2. **Given** the new repository exists, **When** CI runs on a pull request, **Then** lint, typecheck, unit tests, and end-to-end tests all execute and pass.
3. **Given** the new repository's main branch updates, **When** the deploy job completes, **Then** the published bundle at the stable URL serves the latest build within 10 minutes of merge.
4. **Given** a contributor without access to debrief organisation secrets, **When** they run the documented local test command, **Then** the suite completes without requiring any debrief-issued credential. End-to-end tests requiring live GitHub data either skip cleanly or use bundled fixtures.
5. **Given** the new repository, **When** a reader opens its README, **Then** they can identify how to configure it for their own project, how to deploy it, and how to run its tests, without reading any debrief-future documentation.

---

### User Story 3 — Cut over debrief-future to consume the hosted instance (Priority: P3)

A debrief-future contributor wants the monorepo to stop hosting and testing spec-navigator itself. The `apps/spec-navigator/` directory is deleted, root-level dev dependencies used only by it are removed, the documented "Before Pushing" steps shrink by one Playwright suite, and the per-PR review-app comment links out to the hosted spec-navigator instance configured to point at the current branch's specs.

**Why this priority**: This is the final step that realises the savings (lighter CI, smaller install footprint, single source of truth). It depends on Phase 2 being live and stable. Until it lands, the team is paying double — both repos host spec-navigator code.

**Independent Test**: After cutover, debrief-future's full CI runs without the spec-navigator Playwright suite, the install footprint is smaller, and a contributor opening any open PR can click the "spec-navigator" link in the review-app comment and land on a working hosted instance pointed at that PR's specs.

**Acceptance Scenarios**:

1. **Given** Phase 2 is live, **When** the cutover lands, **Then** `apps/spec-navigator/` no longer exists in debrief-future.
2. **Given** the cutover has landed, **When** a contributor runs the documented "Before Pushing" steps, **Then** spec-navigator's Playwright suite is no longer among them.
3. **Given** the cutover has landed, **When** root `package.json` is inspected, **Then** dev dependencies used only by spec-navigator have been removed.
4. **Given** a pull request opens against debrief-future post-cutover, **When** the review-app comment is posted, **Then** it includes a working link to the hosted spec-navigator instance configured to render that PR's specs.
5. **Given** the cutover has landed, **When** project documentation is read (CLAUDE.md, ADRs, README), **Then** every reference to spec-navigator is current — pointing either to the hosted instance, the new repo, or both — with no stale references to the in-monorepo location.
6. **Given** the cutover has landed, **When** an adopter on a third-party project follows the new repo's README, **Then** they can deploy a configured spec-navigator pointing at their own repo within 30 minutes.

---

### Edge Cases

- **In-flight pull requests during cutover**: open PRs against debrief-future at the moment of cutover may have stale references to the deleted `apps/spec-navigator/` path. The cutover plan must define behaviour: rebase guidance, automated fix-up, or accept stale PRs need manual rebasing.
- **Subtree split surfaces cross-cutting commits**: a commit in debrief-future may have touched both `apps/spec-navigator/` and unrelated paths (CI, root config). The extraction must define how those land in the new repo (full commit kept with non-app paths empty, or commit dropped, or commit content trimmed).
- **Spec-artefact format drift**: after cutover, debrief-future may add a new convention to its spec format (a new artefact filename, a new front-matter field). The hosted spec-navigator must either accommodate it via configuration or fail gracefully with a clear error.
- **Hosted-instance outage during a debrief-future PR review**: if GitHub Pages or the hosted instance is unavailable, debrief-future loses the ability to preview specs in the review-app. The cutover plan must define a fallback (cached previous build, local preview instructions, or accepted risk window).
- **Spec-format version unsupported**: a consumer declares a `specFormatVersion` that the deployed navigator cannot render. The app must show a clear, branded error stating both versions, point to the release notes, and avoid leaving the user on a blank page.
- **Live-mode E2E flake on consumer-side rate limit**: the new repository's continuous integration runs the live-GitHub mode against a real Personal Access Token; transient GitHub rate-limit responses must not produce flaky failures that block unrelated pull requests.
- **Adopter PAT scope mismatch**: an adopter configures the app for a private repo and supplies a PAT with insufficient scopes. The app must surface the missing scope clearly rather than rendering a confusing blank state.
- **No PAT / unauthenticated browse**: an anonymous visitor opens the hosted instance configured for a public repo. The app must work within GitHub's anonymous rate limits, with a graceful message when the limit is hit.
- **Configuration schema evolution**: a future spec-navigator release adds a required configuration field. Existing adopters' deployments must either continue to work (backward-compatible defaults) or fail with a clear migration message.
- **Browser-cached old service worker**: the previous version's service worker (per ADR-030) may have cached the in-monorepo build. After cutover, returning users must converge to the hosted instance without manual cache clears.
- **Same-day rollback**: if Phase 3 reveals a regression after cutover, the rollback path is well-defined (revert the deletion PR, redeploy the in-monorepo build to the review-app comment) and rehearsed.

## Requirements *(mandatory)*

### Functional Requirements

#### Phase 1 — Configuration seam (in debrief-future)

- **FR-001**: spec-navigator MUST read its target GitHub repository identifier (organisation and repository name) from a single configuration source rather than hardcoded literals.
- **FR-002**: spec-navigator MUST read its spec-directory path convention (e.g., the `specs/NNN-name/` glob) from configuration.
- **FR-003**: spec-navigator MUST read the set of recognised artefact filenames (e.g., `spec.md`, `plan.md`, `tasks.md`, `evidence/`) from configuration.
- **FR-004**: spec-navigator MUST read its GitHub label and status conventions from configuration.
- **FR-005**: The configuration MUST ship with a default value set that reproduces the current debrief-future user experience without any source-code changes.
- **FR-006**: Every hardcoded debrief literal identified by the Phase 0 audit (`docs/extraction-audit/spec-navigator/coupling-inventory.md`) MUST be replaced by a configuration read; no `debrief`, `debrief-future`, or `debrief.github.io` string may remain in `src/` after Phase 1.
- **FR-007**: Existing Vitest and Playwright suites MUST pass with the default configuration.
- **FR-008**: The configuration source MUST be addressable at build time so a deploy can be parameterised for any target repository without rebuilding the bundle from a forked source tree.
- **FR-009**: Phase 1 MUST land as a single normal pull request to debrief-future, with no extraction work mixed in.

#### Phase 2 — Standalone repository (new repo)

- **FR-010**: The new repository MUST be created with git history derived from the current `apps/spec-navigator/` via a history-preserving subtree split; a fresh `git init` is not acceptable.
- **FR-011**: The new repository MUST have its own continuous integration pipeline that runs, on every pull request: lint, type checks, unit tests, and end-to-end tests.
- **FR-012**: The new repository MUST publish a built bundle to a stable, public URL on every merge to its main branch.
- **FR-013**: The new repository MUST be runnable end-to-end by a contributor who has no debrief organisation membership and no debrief-issued credentials. Tests requiring live GitHub data MUST either skip cleanly or use bundled fixtures.
- **FR-014**: The new repository MUST include documentation that explains, without referring to debrief-future docs: configuration, local development, testing, and deployment.
- **FR-015**: The new repository's hosting MUST be GitHub Pages, deploying a single static bundle of the main branch on every merge. The bundle MUST accept the target repository (and any PR-specific branch identifier) as a URL query-string parameter, so a single deployed instance can render specs for any consumer without rebuilding.
- **FR-016**: The new repository MUST adopt semantic versioning of a `specFormatVersion` field that consumers declare. The application MUST read this field from the consumer's repository at load time, MUST render normally when its supported range covers the consumer's value, and MUST display a clear, actionable error (showing both versions and a link to the relevant release notes) when it does not.
- **FR-017**: The new repository's end-to-end test suite MUST run by default against bundled fixtures so any contributor can produce a green build with no GitHub credential. A live-GitHub mode MUST also be available, opt-in behind an environment variable (e.g., `LIVE_GITHUB=1`) and a Personal Access Token, and MUST be the mode used by the new repository's own continuous integration on its main branch.

#### Phase 3 — Cutover (in debrief-future)

- **FR-018**: `apps/spec-navigator/` MUST be removed from debrief-future, including its source, tests, build configuration, and any per-app scripts.
- **FR-019**: All documentation references to spec-navigator in debrief-future (`CLAUDE.md`, `README.md`, ADRs in `docs/project_notes/decisions.md`, `heroku.yml`, `app.json`, `Dockerfile.preview`) MUST be updated to point at the hosted instance and/or the new repository, with no broken references remaining.
- **FR-020**: Root-level dev dependencies used only by spec-navigator (per the Phase 0 audit) MUST be removed if no other workspace package consumes them.
- **FR-021**: The "Before Pushing" steps documented in `CLAUDE.md` MUST no longer require running spec-navigator's Playwright suite.
- **FR-022**: The per-pull-request review-app comment in debrief-future MUST include a link to the hosted spec-navigator instance configured to render that pull request's branch specs.
- **FR-023**: A new architectural decision record MUST be added to debrief-future documenting the extraction, referencing the audit and this specification.

#### Cross-cutting (all phases)

- **FR-024**: At every phase boundary, the spec-navigator user-facing experience for a debrief-future spec viewer (loading, browsing the spec list, opening an artefact, rendering markdown, following links, viewing evidence) MUST be unchanged from the pre-extraction baseline.
- **FR-025**: Throughout the migration, debrief-future's `main` branch MUST remain shippable; no phase may leave the monorepo in a broken state.
- **FR-026**: The new repository MUST be public and licensed compatibly with debrief-future, so the existing functionality continues to be openly available.

### Key Entities

- **Configuration**: The set of values that parameterise spec-navigator for a specific consumer. Includes target repository identifier, spec-directory path convention, artefact filename set, and label/status conventions. Has a single canonical default that reproduces today's debrief-future behaviour.
- **Spec format version**: A semantic-version value declared by each consumer in a known location of their repository. Identifies which iteration of the spec-artefact contract their specs follow. Used by spec-navigator to decide whether it can render a consumer's specs and to surface a clear error when the consumer's version falls outside its supported range.
- **Target repository**: The GitHub repository whose `specs/` content is being rendered. The application is agnostic to which repository this is.
- **Hosted instance**: The deployed, publicly reachable build of spec-navigator, served from a stable URL controlled by the new repository's deploy pipeline.
- **Source repository (new)**: The standalone GitHub repository created by Phase 2 that owns spec-navigator's source, tests, CI, and deploys.
- **Spec artefact**: A markdown document or directory under `specs/NNN-name/` in the target repository that the application renders (e.g., `spec.md`, `plan.md`, `tasks.md`, `evidence/`).
- **Adopter**: A maintainer of any GitHub repository other than debrief-future who wishes to use spec-navigator for their own project.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A maintainer of an unrelated GitHub repository can deploy a working spec-navigator instance pointing at their own repository within 30 minutes of starting, following only the new repository's README.
- **SC-002**: Zero user-facing regressions are reported in the first 14 days after Phase 3 cutover; the spec viewing experience for debrief-future contributors is indistinguishable from pre-extraction.
- **SC-003**: debrief-future's documented "Before Pushing" check completes faster after cutover than before; specifically, at least one Playwright suite (the spec-navigator one) is no longer invoked.
- **SC-004**: A contributor with no debrief organisation access can clone the new repository, install dependencies, and run the full non-live test suite to a green result within 15 minutes on a clean machine.
- **SC-005**: 100% of the hardcoded debrief literals identified in the Phase 0 audit are replaced by configuration reads after Phase 1; a repository-wide search for `debrief`, `debrief-future`, and `debrief.github.io` in the new repository's `src/` returns zero matches after Phase 2.
- **SC-006**: Every commit that touched `apps/spec-navigator/` in debrief-future before extraction is reachable in the new repository's main-branch history with its original author attribution preserved.
- **SC-007**: After Phase 3, exactly one production deployment of spec-navigator exists; the in-monorepo path no longer hosts a parallel build.
- **SC-008**: The cutover pull request in debrief-future leaves CI green, all internal documentation links resolving, and the per-PR review-app comment functioning end-to-end on at least one subsequent test pull request.

## Assumptions

- The Phase 0 coupling audit at `docs/extraction-audit/spec-navigator/coupling-inventory.md` is exhaustive; any coupling not captured there is treated as out of scope for this work but acceptable to address opportunistically.
- The new repository will be public, matching debrief-future's visibility.
- Configuration is supplied via URL query-string parameters to a single GitHub Pages deployment; build-time configuration of a forked source tree is also supported (e.g., for an adopter who prefers to host their own branded instance) but is not the primary path. Runtime UI to switch target repository mid-session is out of scope.
- The existing app's feature set is the baseline; this migration does not add or remove user-visible features.
- The default new-repository name and organisation are `debrief/spec-navigator` unless explicitly changed; this is the lowest-friction default and preserves the existing GitHub auth, branding, and secret infrastructure. A neutral organisation can be chosen later without affecting any acceptance criterion in this spec.
- Architectural Decision Record ADR-030 (vite-plugin-pwa) will be either re-stated in the new repository's own ADRs or replaced by an equivalent there; debrief-future's ADR-030 will be annotated to point at the new owner.
- "Hosted instance" is assumed to be a single origin; multi-tenant subdomains per adopter are not in scope.
- The Heroku review-app integration in debrief-future remains in place; only its spec-navigator-related links change.

## Dependencies

- The Phase 0 audit (`docs/extraction-audit/spec-navigator/coupling-inventory.md`) is complete and serves as the source of truth for what must be de-coupled in Phase 1.
- Resolution of the new repository's organisation and name (default `debrief/spec-navigator`) before Phase 2 begins.
- A maintainer with permission to create a new repository under the chosen GitHub organisation, enable GitHub Pages on it, and configure secrets for the live-GitHub continuous-integration mode.
- A GitHub Personal Access Token (read-only public scopes sufficient for the default debrief consumer; private-repo scope only if a future adopter requires it) registered as a secret in the new repository for live-mode CI runs.
