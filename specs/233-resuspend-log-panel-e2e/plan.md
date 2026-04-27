# Implementation Plan: Re-activate Log Panel E2E Suite (after #142 resolves)

**Branch**: `233-resuspend-log-panel-e2e` | **Date**: 2026-04-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/233-resuspend-log-panel-e2e/spec.md`

## Summary

Reverse the narrow mute applied by #534 to the openvscode-server log-panel E2E suite, now that the upstream blocker (#142 — VS Code E2E webview reliability research sprint) has merged to main. The work is a small, surgical revert: convert `test.describe.fixme(...)` back to `test.describe(...)` in `tests/e2e/test-log-panel.spec.ts`, remove the `#233 — Re-suspended pending #142` comment block, restore the `scripts/check-log-panel-skip-guard.sh` script that #210 introduced (deleted by #534 to permit the mute), re-wire it into `Taskfile.yml`'s `lint:` task, run the suite three times locally on a post-#142 base, and strike-through #233 in `BACKLOG.md` in the same commit. No production code changes; this is a tests + lint-gate restoration only.

## Technical Context

**Language/Version**: TypeScript 5.x (Playwright spec file), Bash (skip-guard script + `Taskfile.yml`)
**Primary Dependencies**: `@playwright/test ^1.57.0`, `@sparticuz/chromium` (cloud Chromium), openvscode-server (currently v1.109.5; whatever #142 settled on), existing `tests/e2e/fixtures/base.ts` + `tests/e2e/models/code-server-page.ts`
**Storage**: N/A — test-only feature
**Testing**: Playwright E2E (existing `tests/e2e/test-log-panel.spec.ts`, 5 cases) executed via `node apps/vscode/tests/e2e/run-playwright.mjs test-log-panel`; the suite under test IS the deliverable
**Target Platform**: CI VS Code E2E job (Linux, Chromium via `@sparticuz/chromium`); the same job already runs in cloud Claude Code sessions
**Project Type**: Single-repo monorepo (test surface only — no `apps/` / `services/` source touched)
**Performance Goals**: 5/5 tests passing in < 90s wall time (matches the suite's existing budget); zero flakes across 3 consecutive CI runs (the stability gate from FR-003 / SC-001)
**Constraints**: Must not modify the openvscode-server image, the Chromium image, or the test bodies themselves (Out of Scope §132–134); the un-mute is a pure revert plus skip-guard restoration. Must preserve atomic-commit discipline (Constitution XIII.1) — `.fixme` removal, comment block removal, guard restoration, `Taskfile.yml` re-wiring, and BACKLOG strike-through ALL ship in one commit.
**Scale/Scope**: 1 test file edited (~12 line removal), 1 script restored (~40 lines), 1 Taskfile line re-added, 1 BACKLOG row struck-through. ~5 file touches total. 0.5 dev-day per spec estimate §145.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Relevance | Status |
|---------|-----------|--------|
| I — Defence-Grade Reliability | Restored CI coverage of the real code-server → extension host → LogPanel iframe path *raises* reliability; no new failure modes introduced. | ✅ Pass |
| II — Schema Integrity | No schema touched. | ✅ N/A |
| III — Data Sovereignty | No data flows changed. | ✅ N/A |
| IV — Architectural Boundaries | No service/UI boundary touched. | ✅ N/A |
| V — Extensibility | No extension surface touched. | ✅ N/A |
| VI — Testing | This *is* a testing feature: it returns 5 active integration tests to the gate and re-arms the lint-level skip-guard that prevents silent re-skips. Strengthens Article VI. | ✅ Pass |
| VII — Test-Driven AI Collaboration | Spec FR-001..FR-005 + SC-001..SC-004 form the executable acceptance criteria; the un-suspend recipe in `spec.md` §76–107 is the verifiable definition of done. | ✅ Pass |
| VIII — Documentation | Spec already exists; this plan adds research/quickstart. BACKLOG strike-through and (if needed) ADR cross-link captured below. | ✅ Pass |
| IX — Dependencies | Zero new dependencies — restoring a 40-line bash script that already lived in repo history. | ✅ Pass |
| X — Security | No secrets, no network calls, no classification surface. | ✅ N/A |
| XI — Internationalisation | No user-facing strings touched. | ✅ N/A |
| XII — Community Engagement | Public PR; the spec already documents the suspend/un-suspend pattern as a reusable precedent (Story 2). | ✅ Pass |
| XIII — Contribution Standards | One atomic commit (FR-001..FR-005 wording is explicit on `same commit`), PR review required, CI must pass — already the working pattern. | ✅ Pass |
| XIV — Pre-Release Freedom | Not invoked — no breaking changes. | ✅ N/A |
| XV — Strict Type Safety | Test file is TypeScript strict-mode; the only edits are removing `.fixme` and a comment block — no new types introduced, no `any` involved. Skip-guard is bash (out of scope for type-safety). | ✅ Pass |

**Gate result**: PASS. No violations to justify; Complexity Tracking section left empty.

## Project Structure

### Documentation (this feature)

```text
specs/233-resuspend-log-panel-e2e/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature spec (already authored)
├── research.md          # Phase 0 output — three resolved unknowns (post-#142 baseline, atomicity, stability gate)
├── data-model.md        # Phase 1 output — entity-light: the test-state machine + skip-guard contract
├── quickstart.md        # Phase 1 output — operator-facing un-suspend recipe (executable form of spec §76–107)
├── contracts/
│   └── skip-guard.contract.md   # Phase 1 output — the bash script's invariants (input/exit-code/error format)
└── tasks.md             # Phase 2 output (/speckit.tasks command — NOT created by /speckit.plan)
```

### Source Code (repository root)

This feature touches *only* the test + lint surface — no application code, no services, no shared components. The relevant tree:

```text
debrief-future/
├── tests/
│   └── e2e/
│       ├── fixtures/
│       │   └── base.ts                       # (untouched — provides `codeServerPage` fixture)
│       ├── models/
│       │   └── code-server-page.ts           # (untouched — `getLogPanelFrame()` at line 602 must resolve consistently post-#142)
│       └── test-log-panel.spec.ts            # ✏️ EDIT: `test.describe.fixme(...)` → `test.describe(...)`; delete the #233 mute comment (~lines 11–18)
├── scripts/
│   └── check-log-panel-skip-guard.sh         # ✏️ RESTORE: re-create from `git show 5385f6e8:scripts/check-log-panel-skip-guard.sh`
├── apps/
│   └── vscode/
│       └── tests/
│           └── e2e/
│               └── run-playwright.mjs        # (untouched — the runner used to verify locally)
├── Taskfile.yml                              # ✏️ EDIT: re-add `bash scripts/check-log-panel-skip-guard.sh` under `lint:` task; remove the #233 explanatory comment block (lines 115–120)
└── BACKLOG.md                                # ✏️ EDIT: strike-through row 233; status `complete`
```

**Structure Decision**: This is a tests + lint-gate restoration feature. No `Option 1/2/3` source-tree decision applies — the work lives entirely in `tests/e2e/`, `scripts/`, `Taskfile.yml`, and `BACKLOG.md`. The five edits above are surgical and ship together as one atomic commit per FR-001..FR-005.

## Media Components

None - backend/infrastructure feature. This restores E2E test coverage; there are no new visual components, no Storybook stories created or modified, and no UI changes that would benefit from a bundled interactive demo. The blog post (if one is written) will use a before/after table or capability bullets as the Hook — see the cached opening context.

**Inclusion Criteria Applied**:
- [ ] New visual component
- [ ] Significant visual change
- [ ] Interactive demo adds narrative value

## Storybook E2E Testing

None - no interactive UI components. This feature has no Storybook surface; the LogPanel itself already has Storybook coverage independent of this restoration, and that coverage is unchanged.

## Web-Shell E2E Testing

None - no extension workflow changes. Notably, the *parity baseline* for this suite already lives at `apps/web-shell/playwright/tests/log-panel.spec.ts` (referenced in `tests/e2e/test-log-panel.spec.ts` line 7) — the web-shell harness exercises the same five user-observable behaviours and remains green. This feature explicitly returns the **VS Code extension-host** integration path to active coverage; that path is *not* reproducible in the web-shell harness (Out of Scope §134), which is precisely why these five tests exist as openvscode-server E2E rather than web-shell E2E.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No violations — section intentionally left empty.*
