# Tasks: `@debrief/hooks` Workspace Package Extraction — DEFERRED

**Feature**: 246-hooks-workspace-package
**Branch**: `claude/speckit-specify-246-0cgfP`
**Status**: ⏸ **Deferred** — trigger condition has not fired.
**Audit date**: 2026-05-06

---

## Trigger-Gate Audit (the first job of `/speckit.tasks` for this feature)

The spec for #246 is **explicitly trigger-gated**:

- **FR-012**: *"Implementation MUST be gated on confirmation that the trigger condition has fired — i.e. a third consumer (or a second framework-agnostic hook) is in flight or imminent. If at planning time the trigger has not fired, the plan MUST recommend deferring the feature rather than executing speculatively."*
- **Assumption A-001**: *"At planning time, the trigger condition has fired (a third consumer or a second framework-agnostic hook is in flight). If this is not yet true, `/speckit.plan` should recommend deferring the feature rather than executing speculatively (FR-012)."*
- **research.md §R8**: enforces the gate at `/speckit.tasks` time.

The two trigger conditions, restated:

- **T1**: A third in-monorepo consumer of `useIsMobile` has a spec, branch, or PR open (e.g. `spec-navigator` going mobile, `apps/loader` adopting the hook).
- **T2**: A second framework-agnostic hook (e.g. `useReducedMotion`, `useOnlineStatus`, `useFocusVisible`) is being added and needs a home.

### Audit findings (run on 2026-05-06)

| Check | Command | Result |
|-------|---------|--------|
| In-monorepo consumers of `useIsMobile` | `grep -rln "useIsMobile" apps/ shared/ services/` | Two apps: `apps/web-shell` (one site) + `apps/backlog-navigator` (three sites: `App.tsx`, `editors/EditorOverlayProvider.tsx`, plus a comment in `test-setup.ts` and a doc-comment in `types.ts`). Plus `shared/components/src/hooks/useIsMobile.ts` (the source) and `shared/components/src/index.ts` (the barrel re-export). |
| Specs naming `useIsMobile` or `@debrief/hooks` | `grep -rln "useIsMobile\|@debrief/hooks" specs/` | #244 (the trigger that added the *second* consumer — already shipped); #230 (incidental: build-log dist paths only); #235 (incidental: descriptive mention of the existing heuristic, not a consumer). |
| BACKLOG entries for a third consumer or second UI-agnostic hook | `grep -in "useIsMobile\|spec-navigator.*mobile\|loader.*mobile\|useReducedMotion\|useOnlineStatus\|useFocusVisible" BACKLOG.md` | Only #246 itself. No third-consumer item; no second-hook item. |
| Status of #244 (trigger that added consumer #2) | `grep "^\| 244 \| 244\| ~~244~~" BACKLOG.md` | `complete` (closed 2026-05-04). |
| Remote branches matching `mobile\|hook\|loader\|spec-navigator\|reducedmotion\|onlinestatus\|focusvisible` | `git ls-remote --heads origin` | None. |

**Conclusion**: Neither T1 nor T2 has fired. The work is premature.

---

## Decision: Defer

No implementation tasks are generated. The spec, plan, research, data-model, contracts, quickstart, and cached opener are kept on the branch as a **dormant blueprint** — ready to execute as soon as the trigger fires. None of those artefacts are wasted; they materially reduce the cost of the eventual implementation pass to roughly "rerun the audit, then follow `quickstart.md`".

This is the correct outcome per the spec's design. The backlog entry says explicitly:

> *Today (2026-05-02) only `apps/web-shell` and `apps/backlog-navigator` (#244) consume the hook; tree-shake handles the bundle question for those two. Trigger: third consumer (e.g. spec-navigator going mobile, or `apps/loader`) adopting the hook, or any future framework-agnostic hook needing the same home.*

Tree-shake continues to handle the two existing consumers. No bundle-bloat regression is in flight. No second framework-agnostic hook is queued. There is nothing for this feature to deliver today.

---

## Resume instructions (when the trigger fires)

When **either** of the following becomes true, this feature should resume:

1. **A third consumer is in flight.** A spec, branch, or PR exists for an app outside the current `{web-shell, backlog-navigator}` set adopting `useIsMobile`. Plausible candidates named in the backlog and research:
   - `apps/spec-navigator` going mobile (would mirror the `apps/backlog-navigator` mobile work from #244).
   - `apps/loader` (Electron mini-app) needing breakpoint-aware layout.
   - Any new `apps/*` app initialising with `useIsMobile`.

2. **A second framework-agnostic hook needs a home.** A spec or PR is being prepared that adds a hook to `@debrief/components` whose inclusion criteria — *no Debrief-component imports, no non-React runtime deps, works in SSR / jsdom* (FR-008) — say it belongs in `@debrief/hooks` instead. Plausible candidates: `useReducedMotion`, `useOnlineStatus`, `useFocusVisible`, `useViewportSize`, `usePrefersDarkMode`.

When that happens:

1. **Re-run the audit** at the top of this file. Replace this `tasks.md` with the implementation task list.
2. **Verify nothing has drifted** in the meantime: re-check that `useIsMobile` is still where the spec says it is (`shared/components/src/hooks/useIsMobile.ts`), that the import-site inventory in `data-model.md` E3 still matches reality (run the greps in `quickstart.md` step 4), and that the two consumer manifests still don't already declare `@debrief/hooks`.
3. **Generate the task list** following the structure below (templated, to be filled in at resume time).

### Templated task structure for the resume pass

If/when implementation proceeds, the task list should mirror the design captured in `plan.md` / `data-model.md` / `contracts/`. Approximate shape (do **not** treat these as live tasks today — they are deliberately not prefixed with checkboxes):

```text
Phase 1: Setup
  - Scaffold shared/hooks/ package skeleton (package.json, tsconfig.json,
    vitest.config.ts, src/, tests/, README.md).
  - Mirror @debrief/utils conventions (research.md §R1).

Phase 2: Foundation (the new package)
  - Move useIsMobile.ts verbatim from @debrief/components to @debrief/hooks.
  - Write src/index.ts barrel.
  - Write tests/useIsMobile.test.tsx (5 cases per research.md §R5,
    contract C4).
  - Write README.md (sections per contract C5).
  - Verify dependency-shape contract C2 (zero runtime deps; only react peer).
  - Verify no-leak contract C7 (built dist references no banned modules).

Phase 3: Consumer migration (User Story 2 — P1)
  - Migrate apps/web-shell/src/App.tsx (M1.1).
  - Migrate apps/backlog-navigator/src/App.tsx (M2.1).
  - Migrate apps/backlog-navigator/src/editors/EditorOverlayProvider.tsx (M2.2).
  - Update apps/backlog-navigator/src/test-setup.ts comment (M2.3).
  - Update apps/backlog-navigator/src/types.ts comment if needed (M2.4).
  - Add @debrief/hooks workspace dep to both consumer manifests (M1.2, M2.5).

Phase 4: Deprecation shim (@debrief/components)
  - Delete shared/components/src/hooks/useIsMobile.ts (M3.1).
  - Replace barrel export with @deprecated re-export from @debrief/hooks
    (M3.2, contract C6).
  - Add @debrief/hooks workspace dep to components manifest (M3.3).
  - Drop subpath export if present (M3.4 — defensive).

Phase 5: Boundary documentation (User Story 3 — P2)
  - Append ADR entry to docs/project_notes/decisions.md (research.md §R9).
  - Run .specify/scripts/bash/update-agent-context.sh claude.

Phase 6: Verification
  - pnpm install; build new package.
  - Run all dependency-shape and no-leak verifiers from
    quickstart.md steps 2–3.
  - Run repo-wide grep audit from quickstart.md step 4.
  - task verify (lint + typecheck + Vitest + Playwright E2E for web-shell
    and spec-navigator) — must be green with no new exclusions.
  - Manual breakpoint smoke-test (quickstart.md step 7).

Phase 7: Polish & PR
  - Capture test-summary.md (Vitest run for @debrief/hooks + relevant
    consumer suites; CI run summary for task verify).
  - Capture usage-example.md (a 5-line snippet showing the
    "import from @debrief/hooks" usage).
  - Capture before/after dependency-graph evidence (the same mermaid
    asset in evidence/opening-context.md, plus the validated
    contract C7 output as a captured terminal log).
  - Write specs/246-hooks-workspace-package/media/shipped-post.md
    using opening-context.md verbatim for sections 1–3.
  - Log a follow-up backlog item: "remove @debrief/components useIsMobile
    deprecation re-export — one release cycle after #246 lands".
  - Run /speckit.pr.
```

The resume pass should generate the actual checklist-formatted tasks (e.g. `T001`, `T002`, …) at that time, against the then-current state of the repo. Today, generating them speculatively would lock in assumptions that may have drifted.

---

## What is intentionally NOT in this file

- **No implementation tasks.** Per the trigger gate.
- **No evidence-collection tasks.** There is nothing to evidence yet.
- **No PR-creation task.** The branch is not ready for PR until the trigger fires and the implementation lands.

---

## How this file changes when the trigger fires

When `/speckit.tasks` is re-invoked after the trigger condition becomes true:

1. The audit at the top of this file is re-run; if T1 or T2 now holds, it is documented (which consumer, which hook, link to the trigger spec/PR/branch).
2. The "Decision: Defer" section is replaced with a normal Phase 1…Phase N task list following the templated structure above, fully checklist-formatted per the standard task rules.
3. The "Resume instructions" section is removed (it has served its purpose).
4. This file is committed and the implementation pass begins.

Until that happens, this file is the canonical record that #246 has been **planned but deliberately not implemented** — and why.
