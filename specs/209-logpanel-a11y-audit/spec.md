# Feature Specification: LogPanel Accessibility Audit with Theme Responsiveness

**Feature Branch**: `209-logpanel-a11y-audit`
**Created**: 2026-04-22
**Status**: Draft
**Input**: Backlog item 209 — LogPanel axe-core accessibility audit across light/dark/vscode theme variants, extended to fix VS Code theme responsiveness as a prerequisite.

## Background

Feature 176 introduced roving-tabindex (#176 T008) and `aria-selected` on LogPanel cards (#176 T007), but a full accessibility audit was never run. This feature completes that audit. It also surfaces a pre-existing gap: the LogPanel's Storybook stories nominally support three theme variants (light, dark, vscode), but the VS Code styled components do not actually respond to theme changes, making any dark/vscode audit results unreliable. Theme responsiveness must be resolved first so the audit reflects the real end-user experience.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - VS Code Styled Components Respond to Theme Changes (Priority: P1)

A developer switches the Storybook global theme selector from "Light" to "Dark" or "VS Code". The LogPanel and all its sub-components (cards, header, toolbar, scroll area) immediately update their colours, backgrounds, and text to reflect the selected theme — no story reload required.

**Why this priority**: This is a prerequisite for the audit. Running an accessibility audit in "dark" mode against a component that renders with hardcoded light colours produces false results. Fixing theme responsiveness first makes the audit trustworthy.

**Independent Test**: Open the LogPanel story in Storybook, switch the global theme to "Dark", and verify that the panel background, card backgrounds, text, borders, and icons all change to dark-mode values without refreshing the page.

**Acceptance Scenarios**:

1. **Given** the LogPanel story is open in Storybook with the Light theme selected, **When** the developer switches the global theme to Dark, **Then** the panel background, text, and borders update to the dark-theme palette within one render cycle.
2. **Given** the LogPanel story is open with the Dark theme, **When** the developer switches to the VS Code theme, **Then** the panel adopts VS Code-specific colour tokens (sidebar background, editor foreground) rather than generic dark colours.
3. **Given** any LogPanel Storybook story, **When** it is first rendered, **Then** it uses the theme that was active at story load — there is no flash of incorrect colours.

---

### User Story 2 - Full Accessibility Audit Run in All Theme Variants (Priority: P2)

A developer runs the automated accessibility audit against every LogPanel Storybook story in light, dark, and VS Code theme variants. The audit produces a report listing every accessibility violation found, the story and theme variant where each violation occurs, and the recommended fix.

**Why this priority**: This is the core deliverable of backlog item 209. The audit catches violations that manual code review misses and gives the team a quantified baseline for the LogPanel's accessibility health.

**Independent Test**: Run the audit suite; it must complete without crashing for all stories in all three theme variants, and produce a markdown report at `evidence/176-log-panel-ux/a11y-audit.md`.

**Acceptance Scenarios**:

1. **Given** the LogPanel Storybook stories are running, **When** the accessibility audit is executed, **Then** every story is tested in light, dark, and VS Code theme variants — nine test runs minimum (three stories × three themes, or more if additional stories exist).
2. **Given** the audit runs successfully, **When** it completes, **Then** a report file is written to `evidence/176-log-panel-ux/a11y-audit.md` listing each violation with: the story name, the theme variant, the WCAG rule violated, the severity, and the affected element.
3. **Given** the report is produced, **When** a developer reads it, **Then** each violation includes enough context (element description, suggested fix) to action it without needing to re-run the audit.

---

### User Story 3 - Violations Fixed and Verified (Priority: P3)

A developer addresses every violation found in the audit report, re-runs the audit, and confirms that all violations are resolved. The LogPanel passes the full accessibility audit in all three theme variants with zero critical or serious violations.

**Why this priority**: Producing the audit report (P2) is not useful unless the violations it finds are fixed. P3 closes the loop by requiring clean audit results, not just the report.

**Independent Test**: After applying fixes, re-run the full audit suite. The result must show zero critical or serious violations in any story across all three theme variants.

**Acceptance Scenarios**:

1. **Given** the audit report has been produced and violations have been addressed, **When** the audit is re-run, **Then** no critical or serious WCAG violations remain in any LogPanel story in any theme variant.
2. **Given** a fix is applied for a specific violation, **When** the audit is re-run for that story and theme, **Then** that specific violation no longer appears in the results.
3. **Given** the final clean audit run is complete, **When** the developer reviews the updated report, **Then** the report records both the original violations found and the final pass state, providing an auditable history.

---

### Edge Cases

- What happens when a story requires user interaction to enter a specific state (e.g., a selected card) before the audit runs? The audit must cover both the default state and representative interactive states.
- What happens when a theme variant produces a contrast ratio that passes in light mode but fails in dark mode? Both failures must be reported independently — a pass in one theme does not excuse a failure in another.
- What happens when the VS Code theme variant produces different colours than the generic dark variant? Both must be audited separately.
- What happens when a violation exists in the component but cannot be fixed without breaking the feature's design intent? The report must document it as a known exception with justification.
- What happens when new LogPanel stories are added after the audit? The audit must be re-runnable to catch regressions in future.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The LogPanel and all its sub-components MUST visually respond to the Storybook global theme selector, updating their colours and styles when the theme is switched between light, dark, and VS Code variants.
- **FR-002**: The accessibility audit MUST cover every LogPanel Storybook story in all three theme variants: light, dark, and VS Code.
- **FR-003**: The audit MUST produce a written report at `evidence/176-log-panel-ux/a11y-audit.md` containing every violation found, the story and theme where it was detected, the WCAG rule, severity level, and a suggested fix.
- **FR-004**: The audit MUST be re-runnable — a developer must be able to re-execute it at any time to check for regressions.
- **FR-005**: All critical and serious accessibility violations found by the audit MUST be fixed before this feature is considered complete.
- **FR-006**: Colour contrast MUST meet WCAG 2.1 AA requirements in all three theme variants (minimum 4.5:1 for normal text, 3:1 for large text and UI components).
- **FR-007**: The audit MUST test both the default (empty/initial) state of each story and any populated/interactive state that stories expose.
- **FR-008**: The theme responsiveness fix MUST NOT require per-story configuration; the global theme selector in Storybook MUST be sufficient.

### Key Entities

- **LogPanel Story**: A Storybook story for the LogPanel component. Each story represents a specific state or variant of the panel (e.g., empty, with entries, with a selected entry). Each story is audited in all three theme variants.
- **Theme Variant**: One of `light`, `dark`, or `vscode`. The audit treats these as distinct environments because colour contrast and visual presentation differ between them.
- **Accessibility Violation**: A specific failure of a WCAG 2.1 success criterion detected by the audit tool. Characterised by: rule ID, severity (critical, serious, moderate, minor), affected element, story, and theme.
- **Audit Report**: The markdown file produced at `evidence/176-log-panel-ux/a11y-audit.md` documenting all violations found, the fixes applied, and the final pass state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every LogPanel Storybook story renders with correct colours in all three theme variants (light, dark, VS Code) — verified by visual comparison showing no hardcoded colours leaking through.
- **SC-002**: The accessibility audit runs to completion for all stories in all three theme variants and produces the report file at `evidence/176-log-panel-ux/a11y-audit.md`.
- **SC-003**: Zero critical or serious WCAG 2.1 violations remain in the final audit run across all stories and all three theme variants.
- **SC-004**: All theme variants pass WCAG 2.1 AA colour-contrast requirements — no text or UI component falls below the 4.5:1 (normal text) or 3:1 (large text/UI) threshold in any theme.
- **SC-005**: The audit is re-runnable in under 5 minutes, enabling regression detection in CI or on-demand by any developer.
