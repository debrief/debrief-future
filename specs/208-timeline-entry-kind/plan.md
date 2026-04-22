# Implementation Plan: Timeline Entry `kind` Discriminator

**Branch**: `208-timeline-entry-kind` | **Date**: 2026-04-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/208-timeline-entry-kind/spec.md`

## Summary

Introduce an optional discriminator field, `kind: 'snapshot' | 'tool' | 'tune'`, on the UI projection type `TimelineEntry` defined in `shared/components/src/LogPanel/types.ts`. The VS Code host's `toTimelineEntry` populator in `apps/vscode/src/views/logPanelView.ts` sets `kind` on every entry it emits. The interim decision table is a one-to-one mapping of today's `resolveToolCategory(toolName).category === 'snapshot'` check onto `kind: 'snapshot'`; everything else becomes `kind: 'tool'`. The LogPanel consumer (`LogEntry.tsx`) is switched to read `entry.kind === 'snapshot'` instead of recomputing the category check. `'tune'` is reserved in the contract but no populator emits it in this feature — it lands with a future PROV-side signal.

Technical approach: one file adds the discriminator type + an exhaustiveness helper; one file adds a populator mapping; one file swaps the snapshot-detection call site. Unit tests cover the populator mapping table, consumer behaviour under `kind: 'snapshot' | 'tool' | 'tune' | undefined`, and the absent-/unknown-kind fallback. No schema change (TimelineEntry is an explicit UI projection per the T023 comment in types.ts). No new dependencies. Zero user-visible change.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, `any` prohibited per Constitution XV)
**Primary Dependencies**: `@debrief/components` (LogPanel — shared React component library), `@debrief/schemas` (for `LogEntry` input type consumed by the populator — not modified), `@debrief/session-state` (`LogService` — not modified), VS Code Extension API ^1.85.0 (host side). **No new runtime dependencies.**
**Storage**: N/A. `kind` is a transient in-memory field on the UI projection; it is computed on every read from the underlying log source and is never persisted.
**Testing**: `vitest` (shared components + VS Code host unit tests), `@testing-library/react` (LogEntry rendering assertions). No new Playwright tests required — no visible change; existing LogPanel Storybook stories + LogEntry component tests are updated to cover the new branch.
**Target Platform**: VS Code Extension (host + webview); shared components also used in Storybook + nl-demo. Runs in Node (host) and browser (webview / Storybook).
**Project Type**: Monorepo (pnpm workspaces). Two packages touched: `@debrief/components` (LogPanel types + renderer) and `apps/vscode` (host populator).
**Performance Goals**: None. The `kind` computation is a single branch on a string per `TimelineEntry` in `toTimelineEntry` — no measurable cost above today's baseline. The renderer swap (`isSnapshot = entry.kind === 'snapshot'`) is strictly faster than today's call to `resolveToolCategory(entry.toolName).category`.
**Constraints**: Zero user-visible regression (see SC-001). Interim populator MUST map `ToolCategory === 'snapshot'` → `kind: 'snapshot'` identically to today (FR-003, SC-002). No silent-failure fallthrough in switch/match sites that enumerate `kind` (FR-009, Constitution I.3).
**Scale/Scope**: Three source files edited (types.ts, logPanelView.ts, LogEntry.tsx), two test files extended (logPanelView test, LogEntry test). One new small unit file may be added for the exhaustiveness helper (`assertNeverKind`). Expected diff: ≤ 100 lines net additions; interim populator decision table ≤ 10 lines (SC-005).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Relevance | Verdict | Notes |
|---------|-----------|---------|-------|
| I. Defence-Grade Reliability | Offline by default; no silent failures | ✅ Pass | Pure type/populator change. `FR-007` mandates an explicit tool-row fallback for absent/unknown `kind` — no silent crash; no reliance on network. |
| II. Schema Integrity | LinkML as single source of truth | ✅ Pass | `TimelineEntry` is a documented UI projection (see T023 comment at `types.ts:66-71`), NOT a LinkML-derived type. Discriminator is UI-only and stays local to the projection. No LinkML edit, no regeneration. The schema `LogEntry` (input to the populator) is unchanged. |
| III. Data Sovereignty | Provenance always; local-first | ✅ Pass | `kind` does not alter provenance records. It is computed at render time from the immutable `LogEntry` source and never written back. No new telemetry or external call. |
| IV. Architectural Boundaries | Services never touch UI; frontends never persist | ✅ Pass | Populator lives in the VS Code host (where UI projection is permitted — this is the host→webview serialisation boundary); renderer consumes. No service code touched. No new persistence. |
| V. Extensibility | Fail-safe loading | ✅ Pass | `FR-007` mandates fallback rendering for unknown `kind` values; future discriminator extensions are additive without breaking current consumers. |
| VI. Testing | Unit tests for services + workflows | ✅ Pass | Unit tests on the populator mapping (Phase 2 tasks), renderer under the four `kind` states (`'snapshot' | 'tool' | 'tune' | undefined`), and the fallback path. Schema adherence tests: N/A (no schema change). |
| VII. Test-Driven AI Collaboration | Acceptance criteria first | ✅ Pass | Spec has 9 FRs + 5 SCs + 3 user-story acceptance scenarios; this plan maps each FR/SC to a concrete test location in Phase 1 artefacts. |
| VIII. Documentation | Specs before code; architecture decisions recorded | ✅ Pass | Spec written (spec.md); this plan records the interim-populator decision; the `kind` union rationale is documented inline in `types.ts` (planned). ARCHITECTURE.md / decisions.md update is not required (discriminator is a routine UI-projection evolution, not an ADR-worthy cross-cutting decision). |
| IX. Dependencies | Minimal, vetted | ✅ Pass | No new dependencies. |
| X. Security | No secrets in code; classification awareness | ✅ Pass | No secrets handled. No network dependency introduced. |
| XI. Internationalisation | User-facing strings externalisable | ✅ Pass (no user-facing strings added) | Feature adds no strings. Existing snapshot label stays in `LOG_PANEL_STRINGS`. |
| XII. Community Engagement | Public by default; beta previews | ✅ Pass | Planning post + LinkedIn summary produced in Phase 2 (media content); Heroku Review App continues to render the LogPanel unchanged, giving stakeholders a silent smoke-test of the zero-regression promise. |
| XIII. Contribution Standards | Atomic commits, PR review, CI green | ✅ Pass | Feature is sized to land as one atomic PR (types + populator + consumer + tests). |
| XIV. Pre-Release Freedom | Breaking changes permitted pre-v4 | N/A — feature is non-breaking | `kind` is optional; absent value falls back to today's behaviour. Even if it weren't, pre-release freedom would apply. |
| XV. Strict Type Safety | No `any`; explicit types; strict mode | ✅ Pass | Discriminator is a string-literal union. The exhaustiveness helper uses `never` — no `any`/`unknown` reaches production code. Populator decision table is fully typed on both input (LogEntry) and output (TimelineEntry). Renderer checks narrow to the discriminant via literal comparison. |

**Gate result**: ✅ All articles pass. No violations. No entries required in the "Complexity Tracking" section.

## Project Structure

### Documentation (this feature)

```text
specs/208-timeline-entry-kind/
├── plan.md              # This file (/speckit.plan output)
├── spec.md              # Feature specification (/speckit.specify output)
├── research.md          # Phase 0 output (this run)
├── data-model.md        # Phase 1 output (this run)
├── quickstart.md        # Phase 1 output (this run)
├── contracts/
│   └── timeline-entry-kind.contract.md   # Type-contract description (TypeScript signatures)
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit.specify output)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

This is a monorepo (pnpm workspaces). Only two packages are touched. The paths below reflect the real directories in play.

```text
shared/
└── components/
    └── src/
        └── LogPanel/
            ├── types.ts                  # ← EDIT: add `kind` to TimelineEntry; add TIMELINE_ENTRY_KINDS const + assertNeverKind helper
            ├── LogEntry.tsx              # ← EDIT: switch `isSnapshot` derivation to `entry.kind === 'snapshot'`, with fallback
            └── __tests__/
                └── LogEntry.test.tsx     # ← EDIT: extend tests for kind-based snapshot detection + fallback

apps/
└── vscode/
    └── src/
        └── views/
            └── logPanelView.ts           # ← EDIT: toTimelineEntry populates `kind` via interim decision table
        └── __tests__/                    # (if an equivalent test dir exists; otherwise a new test file)
            └── logPanelView.test.ts      # ← NEW or EDIT: unit tests for the kind populator mapping
```

**Structure Decision**: Existing monorepo layout — `shared/components/` for the UI projection type and the LogPanel renderer; `apps/vscode/` for the host populator. No new directories, no new packages, no new workspaces. The `contracts/` directory under the spec holds the language-neutral type-contract description (TypeScript signatures), but the *implementation* of those contracts is the existing `types.ts` file — not a separate contract module.

## Media Components

No Storybook bundle for a blog post is planned. The feature makes no visible change to the LogPanel — existing snapshot rendering (from feature 176 Storybook stories) is preserved byte-for-byte. There is no new component to demo, no new story file, and no new theme-variant rendering.

**Media Components Table**:

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| _(none)_ | _(n/a)_ | _(n/a)_ | _(n/a)_ |

**Inclusion Criteria Applied**:

- [ ] New visual component — **No.** No new component; no existing component's render changes.
- [ ] Significant visual change — **No.** SC-001 explicitly mandates zero visual regression.
- [ ] Interactive demo adds narrative value — **No.** A demo of "the discriminator now drives snapshot detection" is not visually distinguishable from a demo of "the category-equality check drives snapshot detection".

**Bundleability Verified**:

- [ ] Stories exist in Storybook — N/A (no demo planned).
- [ ] Components render standalone (no app context required) — N/A.
- [ ] Reasonable bundle size expected (< 500KB) — N/A.

**Storybook Link**: N/A for this feature. The existing LogPanel stories at `shared/components/src/LogPanel/LogPanel.stories.tsx` remain the canonical entry point and continue to render identically pre- and post-change.

**None — tech-debt / data-contract feature with no visible component delta.** Planning and shipped blog posts are text-only.

## Storybook E2E Testing

No new Playwright tests. The feature introduces no visible change and no new interactive behaviour in any Storybook story. Existing LogPanel Storybook stories continue to render identically — a change in what they'd exercise visually would be a regression (and would fail SC-001).

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| _(none)_ | _(n/a)_ | _(n/a)_ | _(n/a)_ |

**Testing Strategy**:

- [ ] Component renders correctly in all theme variants — covered by existing feature-176 tests; no delta.
- [ ] Interactive elements respond to user input — N/A; no new interactions.
- [ ] Accessibility attributes present — no change to aria attributes.
- [ ] Screenshots captured for evidence — N/A; visual-parity evidence (SC-001) is collected via a side-by-side screenshot from the existing feature-176 snapshot story, captured once before and once after the change. Filed under `specs/208-timeline-entry-kind/evidence/visual-parity.md` at implementation time (per the evidence template in `.specify/templates/evidence/`).

**Test File Location**: N/A — no new Playwright test file. Unit tests live with the code (see "Project Structure" above).

**None — no new interactive UI components; zero visible delta.**

## VS Code Webview E2E Testing

No new webview E2E tests. The host populator change is covered by the host-side unit test; the webview renderer change is covered by the component-level React test. The extension workflow (open file → see LogPanel → entries render) continues to work exactly as before — no new workflow to exercise, and no existing workflow changes semantically.

| Workflow | Panels Involved | Key Selectors | Interactions |
|----------|----------------|---------------|--------------|
| _(none)_ | _(n/a)_ | _(n/a)_ | _(n/a)_ |

**Testing Strategy**:

- [ ] Extension workflow works end-to-end in code-server — covered by existing feature-176 webview smoke tests; no delta.
- [ ] Webview content accessible via `frameLocator` chaining — no selector change.
- [ ] Page objects updated for new selectors — no new selectors.
- [ ] Screenshots captured for evidence — visual-parity evidence is captured from Storybook (see above), not from code-server.

**Test File Location**: N/A — no new webview E2E test.

**None — no extension workflow changes.**

## Complexity Tracking

*No Constitution Check violations — this section is intentionally empty.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _(none)_ | _(n/a)_ | _(n/a)_ |
