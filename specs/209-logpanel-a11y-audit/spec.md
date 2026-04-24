# Feature Specification: LogPanel Accessibility Audit (axe-core)

**Feature Branch**: `209-logpanel-a11y-audit`
**Created**: 2026-04-24
**Status**: Draft
**Input**: User description: "LogPanel axe-core accessibility audit — run `@axe-core/playwright` against every LogPanel Storybook story in `light` + `dark` + `vscode` theme variants; produce `evidence/176-log-panel-ux/a11y-audit.md` with violations + fixes. (follow-up to #176)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Produce a trustworthy a11y audit report (Priority: P1)

A maintainer of the LogPanel component needs a complete, reproducible accessibility audit covering every LogPanel Storybook story across every supported theme. The audit report must list every violation with enough context (rule, WCAG tag, severity, story, theme, DOM selector, help URL) to decide whether to fix it now, accept it, or defer it. Without this, the team is shipping LogPanel with unknown a11y debt — feature 176 delivered roving-tabindex and `aria-selected` but explicitly deferred the full audit to this feature.

**Why this priority**: This is the whole point of the feature. The report is the artefact that makes subsequent fix work targeted and defensible. Without the report, nothing else in the feature matters.

**Independent Test**: A reviewer can open `specs/176-log-panel-ux/evidence/a11y-audit.md` at the tip of this feature's branch and find: (a) a table enumerating every `story × theme` pair audited, (b) a list of each unique violation with rule ID, WCAG tag, severity, offending stories/themes, and help URL, and (c) a classification (fix-now / accepted / deferred) with rationale for each violation. If any LogPanel story or supported theme is missing from the audit matrix, the report fails this test.

**Acceptance Scenarios**:

1. **Given** the LogPanel Storybook story set and the three supported themes (`light`, `dark`, `vscode`), **When** the audit runner is invoked, **Then** every `story × theme` combination is exercised and a violation list is recorded for each.
2. **Given** a completed audit run, **When** the reviewer opens the evidence markdown, **Then** it contains YAML front matter with `git_sha` and `captured_at`, a coverage matrix, an aggregated violations table, and a classification column for each violation.
3. **Given** an audited violation, **When** the reviewer reads its entry, **Then** the entry includes the axe rule ID, the affected WCAG success criterion, the axe severity (minor/moderate/serious/critical), the list of `(story, theme)` pairs that reproduce it, a stable selector or node identifier, and a link to the axe help documentation.

---

### User Story 2 - Close the "fix-now" findings (Priority: P2)

Once the audit has classified findings, everything in the "fix-now" bucket (serious/critical severity at WCAG 2.1 AA, plus any moderate finding with an obvious low-risk fix) must ship in the same feature branch so that LogPanel enters a known-good a11y baseline. Anything deferred must have a follow-up backlog entry opened so it is not lost.

**Why this priority**: A report without remediation only documents debt; it does not reduce it. This story converts findings into shipped fixes while keeping the scope finite.

**Independent Test**: After re-running the audit on the final branch state, zero serious or critical violations remain against the WCAG 2.1 AA tag set. Every deferred finding is cross-referenced to a backlog row by ID in the report.

**Acceptance Scenarios**:

1. **Given** the final audit run against the merged branch state, **When** violation severity is tallied, **Then** the count of `serious` and `critical` violations at `wcag2aa` / `wcag21aa` is zero.
2. **Given** a finding classified "deferred", **When** the reviewer reads its row, **Then** the row cites a backlog ID (e.g. `#NNN`) where follow-up is tracked, with a one-line reason for deferral.
3. **Given** a finding classified "accepted", **When** the reviewer reads its row, **Then** the row includes a rationale explaining why the violation is a false positive or an acceptable trade-off (e.g. Storybook decorator artefact, not component behaviour).

---

### User Story 3 - Keep the audit reproducible (Priority: P3)

An engineer picking up LogPanel work three months later must be able to re-run the same audit locally, confirm the report is still current, and regenerate it with a single command. The audit should not depend on hand-curated story lists or brittle URLs — adding a new LogPanel story should automatically bring it into coverage.

**Why this priority**: Reproducibility is the mechanism that keeps the audit from decaying. If re-running requires reverse-engineering, the baseline will drift silently.

**Independent Test**: A developer who has never run the audit before can, from a clean checkout, run one documented command (or task) that (a) starts Storybook, (b) iterates every story × theme, (c) writes the audit report to the canonical path, and (d) exits non-zero if serious/critical violations are present. Coverage is derived from Storybook's own story index, not a static list.

**Acceptance Scenarios**:

1. **Given** a fresh checkout with dependencies installed, **When** the audit command is invoked, **Then** Storybook is started (or a pre-built static Storybook is used), the audit runs to completion, and the evidence markdown is updated in place.
2. **Given** a new LogPanel story is added to `shared/components/src/LogPanel/`, **When** the audit is re-run without any additional configuration, **Then** the new story is automatically audited across all three themes.
3. **Given** the audit completes with one or more `serious` or `critical` violations, **When** the runner exits, **Then** the exit code is non-zero so the run can act as a CI gate if wired up.

---

### Edge Cases

- **Theme-only violations**: Some violations (especially `color-contrast`) may reproduce only in one theme. The report must capture the `(story, theme)` tuple, not just the story, so that theme-specific regressions are not masked by averaging.
- **Decorator-origin violations**: Storybook's toolbar / canvas wrapper can itself raise violations that are not the component's fault. The audit runner must scope axe to the story root (a stable container inside the iframe), not the whole document, and must document what it scopes.
- **Interaction-only states**: Stories that rely on user interaction (e.g. selected card, expanded parameter editor) are captured in whatever initial state the story renders — the audit does not drive interactions. Any a11y concern that only surfaces mid-interaction is out of scope for this feature and becomes a follow-up.
- **Flaky violations**: If a violation appears intermittently across identical runs (e.g. due to animation timing), it is recorded once with a note and classified "deferred" pending stabilisation.
- **New stories added mid-feature**: If LogPanel stories change during feature 209 itself, the audit runs against whatever the tip of the branch contains at audit time; the `git_sha` in the front matter pins the audit to that state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The audit MUST run axe-core against every Storybook story under the LogPanel scope (both `LogPanel.stories.tsx` and `ParameterEditor.stories.tsx`) in each of the three supported themes: `light`, `dark`, and `vscode`.
- **FR-002**: The audit MUST use at minimum the WCAG tag set `wcag2a`, `wcag2aa`, `wcag21aa`, matching the precedent already established in the `spec-navigator` a11y suite.
- **FR-003**: The audit MUST produce an evidence markdown file at `specs/176-log-panel-ux/evidence/a11y-audit.md`. The file MUST contain YAML front matter with `git_sha` (commit audited), `captured_at` (ISO-8601 timestamp), and a human-readable `axe_version`.
- **FR-004**: The evidence markdown MUST include a coverage matrix that lists every `(story, theme)` pair exercised and marks each pair pass / fail / error.
- **FR-005**: The evidence markdown MUST include an aggregated violations section. Each unique violation (keyed by axe rule ID) MUST record: rule ID, short rule description, axe severity (`minor` / `moderate` / `serious` / `critical`), associated WCAG tags, list of reproducing `(story, theme)` pairs, representative DOM selector, and axe help URL.
- **FR-006**: Each violation in the report MUST carry a classification of exactly one of: `fix-now`, `accepted`, or `deferred`, with a rationale line. Every `deferred` entry MUST cite a backlog row by ID where the follow-up is tracked.
- **FR-007**: Every violation classified `fix-now` in the initial audit MUST be closed by code changes on this feature branch so that a final audit run (at branch tip) reports zero `fix-now` items remaining. The final audit run MUST show zero `serious` or `critical` violations under the WCAG 2.1 AA tag set.
- **FR-008**: The audit runner MUST scope axe to the story render container inside the Storybook iframe (not the whole document) to exclude Storybook chrome from results. The scoping selector MUST be documented in the report.
- **FR-009**: The audit runner MUST discover stories from Storybook's own story index rather than a static hand-maintained list, so that a newly-added LogPanel story is automatically covered without runner edits.
- **FR-010**: The audit runner MUST exit with a non-zero status when the final run contains any `serious` or `critical` violations at WCAG 2.1 AA, so the runner can serve as a gate.
- **FR-011**: The audit runner MUST be invokable from a single documented command (or `task` target) that takes a clean repo to a written evidence markdown without additional manual steps.
- **FR-012**: The `@axe-core/playwright` dependency MUST be declared in the devDependencies of the package that owns the audit runner, and MUST be pinned to a specific version (matching the precedent already set in `apps/spec-navigator`).
- **FR-013**: The audit MUST NOT write transient or machine-generated artefacts (e.g. per-run JSON dumps, screenshots used only during authoring) into the committed evidence directory; only the curated markdown is committed.

### Key Entities

- **Audit Run**: A single execution of the runner. Has a `git_sha`, `captured_at`, `axe_version`, a coverage matrix, and a list of findings. Superseded by later runs; only the most recent committed run is canonical.
- **Coverage Entry**: One row in the coverage matrix. Represents a single `(story, theme)` pair and records whether axe ran successfully and whether violations were found.
- **Violation Finding**: A unique axe rule failure aggregated across all reproducing `(story, theme)` pairs. Has a severity, WCAG tag list, help URL, DOM selector example, and a classification (`fix-now` / `accepted` / `deferred`) with rationale.
- **Evidence Markdown**: The human-readable `a11y-audit.md` that is committed to the repo. Derived from an Audit Run; carries the front matter that pins it to a specific commit.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every LogPanel Storybook story (both `LogPanel.stories.tsx` and `ParameterEditor.stories.tsx`) is audited in all three themes, and the coverage matrix in the evidence markdown shows no gaps.
- **SC-002**: After the feature lands, zero `serious` or `critical` axe violations remain open for LogPanel at WCAG 2.1 AA severity.
- **SC-003**: Every deferred finding in the report is traceable to a backlog row that a reader can look up by ID.
- **SC-004**: An engineer with a clean checkout can reproduce the audit end-to-end in under five minutes using a single documented command.
- **SC-005**: Adding a new LogPanel Storybook story requires zero edits to the audit runner for that story to be covered on the next run.
- **SC-006**: The evidence markdown front matter (`git_sha`, `captured_at`, `axe_version`) allows any future reader to determine exactly which component state was audited and with which tool version.

## Assumptions

- **Evidence path**: The canonical location is `specs/176-log-panel-ux/evidence/a11y-audit.md`. The backlog row text reads `evidence/176-log-panel-ux/a11y-audit.md`; the spec-dir convention used throughout this repo (`specs/NNN-<name>/evidence/`) takes precedence, matching how every other evidence artefact is laid out.
- **Scope — which stories count as "LogPanel"**: Both `LogPanel.stories.tsx` (13 stories) and `ParameterEditor.stories.tsx` (~10 stories) are in scope, since ParameterEditor is a LogPanel sub-component and its stories ship alongside LogPanel stories. Any other Storybook story outside `shared/components/src/LogPanel/` is out of scope.
- **Theme matrix**: The three themes audited are `light`, `dark`, and `vscode`, matching the global theme toolbar already wired up in `shared/components/.storybook/preview.tsx`. If additional themes are added later, this feature's audit does not auto-extend to them — a follow-up would be required.
- **WCAG baseline**: The audit targets WCAG 2.1 AA (tag set `wcag2a`, `wcag2aa`, `wcag21aa`), matching the existing `spec-navigator` audit precedent. Higher levels (AAA) are out of scope.
- **Fix-now threshold**: Serious and critical severity findings at WCAG 2.1 AA are in scope to fix in this feature. Moderate and minor findings are documented and classified but may be deferred to follow-up backlog items unless the fix is obviously cheap. This is a judgement call during implementation.
- **CI wiring**: The audit runner MUST be reproducible locally (FR-011) and MUST exit non-zero on serious/critical findings (FR-010) so it is ready for CI adoption. Whether to actually wire it into `.github/workflows/ci.yml` as a blocking gate is left to a follow-up — this feature ships the audit and the gate-capable runner, not the CI wiring decision.
- **Interactions out of scope**: The audit captures each story in whatever initial state it renders. It does not drive clicks, keyboard navigation, or parameter edits during the audit. Interactive-state-only violations become follow-up work.
- **Dependency precedent**: `@axe-core/playwright` is already in use at `apps/spec-navigator` (currently `^4.8.5`). The same version is adopted here to avoid cross-package drift; upgrades are handled as routine dep hygiene.

## Dependencies

- **Feature 176 (LogPanel UX)** — must be landed so the roving tabindex (T008) and `aria-selected` (T007) a11y work is already in place. Otherwise the baseline audit would be dominated by findings already scheduled elsewhere. Status as of 2026-04-24: 176 is landed; `specs/176-log-panel-ux/evidence/` exists.
- **Storybook harness** — the `@debrief/components` Storybook (port 6006) must start cleanly and list stories; this is the existing harness, no new work.
- **axe-core precedent** — `apps/spec-navigator/` already uses `@axe-core/playwright`; this feature reuses the same pattern (AxeBuilder with WCAG tag filters, JSON result, markdown summary).
