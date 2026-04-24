# Implementation Plan: LogPanel Accessibility Audit (axe-core)

**Branch**: `209-logpanel-a11y-audit` | **Date**: 2026-04-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/209-logpanel-a11y-audit/spec.md`

## Summary

Produce a reproducible WCAG 2.1 AA audit of every LogPanel Storybook story across the three supported themes (`light`, `dark`, `vscode`), classify findings, close the serious/critical ones on this branch, and commit the curated report to `specs/176-log-panel-ux/evidence/a11y-audit.md`. The audit runner is a new Playwright spec under `shared/components/e2e/` that drives Storybook's `/iframe.html` URL with the `globals=theme:...` query parameter, discovers stories dynamically from Storybook's `index.json`, and runs `AxeBuilder` with tags `wcag2a`, `wcag2aa`, `wcag21aa` (matching the existing `apps/spec-navigator` precedent). The runner is gated by an env flag (`AXE_CAPTURE=1`), emits a single machine-readable JSON dump plus a curated markdown report, and exits non-zero when `serious`/`critical` findings are present so it can later be wired into CI.

## Technical Context

**Language/Version**: TypeScript 5.x (Playwright spec + axe orchestration); no Python in scope.
**Primary Dependencies**:
- **NEW**: `@axe-core/playwright ^4.8.5` added to `shared/components/devDependencies` (pinned to the same version already used by `apps/spec-navigator`).
- Existing: `@playwright/test ^1.58.0`, `@sparticuz/chromium ^143.0.4`, Storybook 8.4.0 (including `@storybook/addon-a11y` already present).
**Storage**: Filesystem only. Curated markdown committed at `specs/176-log-panel-ux/evidence/a11y-audit.md`; transient JSON dump written to the same directory and ignored by Git (see FR-013). No runtime data store.
**Testing**: Playwright 1.58 drives Storybook-built static iframe; axe-core runs against each story's render container. Existing `shared/components/playwright.config.ts` (Claude Code–aware via `CLAUDE_CODE` env var) is reused unchanged. Unit tests unaffected.
**Target Platform**: Developer workstation + CI (Linux, macOS, Windows) under Node 20. `@sparticuz/chromium` keeps cloud sessions (Claude Code on the web) runnable without a system browser.
**Project Type**: Single package (`@debrief/components`) — no new package added; the audit lives beside existing `e2e/` specs.
**Performance Goals**: Full audit (~23 stories × 3 themes ≈ 69 axe invocations) completes in under 5 minutes on a developer workstation (SC-004). Single axe run should stay under 2 s per `(story, theme)` pair.
**Constraints**:
- No network beyond the local Storybook server (Article I — offline by default). `@axe-core/playwright` ships axe-core locally; no CDN.
- Runner MUST exit non-zero on serious/critical findings (FR-010) so it is gate-capable.
- Must not write transient artefacts into the committed evidence directory (FR-013).
- Must discover stories dynamically — no hand-maintained list (FR-009).
**Scale/Scope**: ~23 LogPanel + ParameterEditor stories today, expected to grow. Design must scale linearly with story count without code changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Status | Notes |
|---------|--------|-------|
| I. Defence-Grade Reliability | ✅ PASS | Audit is offline (local Storybook); no cloud calls. Failures are explicit (non-zero exit + markdown classification). |
| II. Schema Integrity | ✅ N/A | No schema changes. The JSON dump uses an ad-hoc schema (`axe-report-v1`) already established by spec-navigator; no LinkML model needed because it is not a domain artefact. |
| III. Data Sovereignty | ✅ N/A | No user data flows through the audit. The report records component DOM selectors only. |
| IV. Architectural Boundaries | ✅ PASS | Test-only feature in the frontend package; no service changes. |
| V. Extensibility | ✅ PASS | Story discovery via Storybook's `index.json` ensures new stories (including `contrib/`) are covered automatically. |
| VI. Testing | ✅ PASS | Adds one automated audit spec. Existing vitest suite untouched; no regressions introduced. Audit is itself a test. |
| VII. Test-Driven AI Collaboration | ✅ PASS | Done-definition is explicit: the coverage matrix in `a11y-audit.md` must show every `(story, theme)` pair exercised, and no serious/critical findings remain. The spec's acceptance scenarios act as the completion tests. |
| VIII. Documentation | ✅ PASS | Spec exists (`spec.md`); evidence report is the user-facing artefact. Brief run instructions added to `docs/project_notes/` is optional (decision: inline the command in the evidence markdown header rather than a separate doc — see research.md §R4). |
| IX. Dependencies | ✅ PASS | One new dep (`@axe-core/playwright`), pinned to the exact version already used by spec-navigator (`^4.8.5`). Justification: widely-used MIT-licensed library; precedent set in repo. See research.md §R1. |
| X. Security | ✅ PASS | No secrets. No classified data. Runs locally only. |
| XI. Internationalisation | ✅ PASS | Audit does not generate user-facing strings. The audited component already passes `LOG_PANEL_STRINGS` through i18n. |
| XII. Community Engagement | ✅ PASS | The audit report is a public evidence artefact; findings are visible. |
| XIII. Contribution Standards | ✅ PASS | Atomic commit per concern; PR-gated; CI passes (no changes to existing gates). |
| XIV. Pre-Release Freedom | ✅ PASS | Pre-v4.0.0; not applicable as a constraint. |
| XV. Strict Type Safety | ✅ PASS | New TS code uses explicit types; no `any`. Axe result types imported from `@axe-core/playwright`. |

**Gate result**: ALL PASS. No violations to justify in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/209-logpanel-a11y-audit/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature spec (/speckit.specify)
├── research.md          # Phase 0 output (/speckit.plan)
├── data-model.md        # Phase 1 output (/speckit.plan)
├── quickstart.md        # Phase 1 output (/speckit.plan)
├── contracts/           # Phase 1 output: JSON schema for axe-report + markdown report structure
│   ├── axe-report.schema.json
│   └── a11y-audit.md.template.md
├── checklists/
│   └── requirements.md  # /speckit.specify quality checklist
└── evidence/
    └── opening-context.md  # Phase 2 cached opener (content-specialist)
```

Downstream evidence (written into feature 176's spec dir per FR-003):

```text
specs/176-log-panel-ux/evidence/
├── a11y-audit.md        # Curated markdown report (committed; NEW)
└── a11y-audit.json      # Machine-readable dump (gitignored; NEW)
```

### Source Code (repository root)

```text
shared/components/
├── src/LogPanel/          # UNCHANGED unless a "fix-now" finding requires edits
│   ├── LogPanel.tsx
│   ├── LogEntry.tsx
│   ├── LogActionBar.tsx
│   ├── ParameterEditor/...
│   ├── LogPanel.stories.tsx
│   └── ParameterEditor.stories.tsx
├── e2e/
│   ├── LogPanel.spec.ts                  # EXISTING
│   └── LogPanel-a11y-axe.spec.ts         # NEW — the audit runner
├── scripts/
│   └── a11y-audit-report.ts              # NEW — post-run: JSON → curated markdown
├── playwright.config.ts                  # UNCHANGED (Claude Code–aware already)
├── .storybook/
│   ├── preview.tsx                       # UNCHANGED (theme globals already wired)
│   └── main.ts                           # UNCHANGED
└── package.json                          # devDeps +1, script +1 ("a11y:audit")
```

Ignored-by-Git addition (root `.gitignore`):

```text
specs/176-log-panel-ux/evidence/a11y-audit.json
```

**Structure Decision**: Single-package, test-only feature. The audit runner lives in `shared/components/e2e/` beside the existing `LogPanel.spec.ts`, reusing the package's Playwright config and Storybook harness. A small companion script (`scripts/a11y-audit-report.ts`) transforms the JSON dump into the curated markdown — keeping the Playwright spec focused on capture and the report shape as a separate, unit-testable concern. No new package, no changes to the monorepo layout, no service-side changes.

## Media Components

None — this is an infrastructure/audit feature. The report itself is a committed markdown artefact; it is neither a Storybook component nor an interactive demo. Subsequent "fix-now" commits on this branch may edit `LogPanel.tsx` or sibling components, but those are bug-fix–style edits to existing components, not new visual components introduced by the feature. If fixes produce a visually interesting before/after, a screenshot pair may be captured in `specs/209-logpanel-a11y-audit/evidence/screenshots/` during `/speckit.pr`, but no Storybook bundle is needed.

## Storybook E2E Testing

The audit itself IS the Storybook E2E test for this feature. Scope below:

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| Every `logpanel--*` story (discovered via `/index.json`) | axe-core violations with tags `wcag2a`, `wcag2aa`, `wcag21aa` | `light`, `dark`, `vscode` | None — static render only (see Edge Case "Interaction-only states") |
| Every `logpanel-parametereditor--*` story (same discovery) | Same | Same | None |

**Testing Strategy**:
- [x] Stories render correctly in all theme variants (pre-condition; asserted by `page.waitForSelector('#storybook-root > *')` before running axe).
- [ ] Interactive elements respond to user input — *deliberately out of scope per spec Edge Cases*.
- [x] Accessibility attributes present (`aria-*`, `role`, `tabindex`) — this is literally what axe-core checks.
- [x] Evidence captured (JSON dump + curated markdown at `specs/176-log-panel-ux/evidence/`).

**Test File Location**: `shared/components/e2e/LogPanel-a11y-axe.spec.ts`

**Theme Variant URLs** (driven programmatically; one URL per `(storyId, theme)`):
```
/iframe.html?id=<storyId>&globals=theme:light
/iframe.html?id=<storyId>&globals=theme:dark
/iframe.html?id=<storyId>&globals=theme:vscode
```

Story IDs are resolved at runtime from `http://127.0.0.1:6006/index.json` (or the built static equivalent when running against `storybook-static/`) and filtered to entries whose `importPath` starts with `./src/LogPanel/`.

## Web-Shell E2E Testing

None — this feature does not change any extension workflow. The LogPanel host webview (`apps/vscode/src/views/logPanelView.ts`) is not re-tested here; the audit operates at the Storybook level where the component renders in isolation, which is sufficient for a11y validation.

## Complexity Tracking

*Not applicable — Constitution Check passed with no violations.*
