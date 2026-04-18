# Code-quality cleanup: small-bucket consolidation

## Problem
Five low-risk cleanup actions surfaced by the code-quality review pass (PR #465 report, April 2026) are each too small to justify a spec of their own but share the same profile — pure TS/doc edits, no schema work, no cross-package API changes, independent of all other follow-up items. Bundling them into one spec/PR keeps review overhead low while still capturing the work.

## Proposed Solution
Ship the following five changes in a single PR:

1. **Document residual VS Code view↔service type-only cycles** in `docs/project_notes/decisions.md`. The cycles `mapPanel → activityPanelView → calcService` and `activityPanelView → resultsPanelService` are all `import type` and erased at runtime; record that they are intentionally accepted, with the interface-extraction refactor noted as the eventual fix.

2. **Merge `LogTimelineProps` and `LogByFeatureProps`** (`shared/components/src/LogPanel/types.ts`) into a single `LogPanelProps` interface. Both components consume the same shape; collapse to one.

3. **Delete `shared/components/diff/` sub-package.** Not in `pnpm-workspace.yaml`, zero external references, added in commit `05e6289` as a staging artefact. Restorable from git if integration work resumes.

4. **Add `specs/**` to knip's ignore config** so speckit contract `.ts` files stop being flagged as unused. Pure false-positive silencing.

5. **Fix the `plotName` placeholder** at `apps/loader/src/renderer/hooks/useLoadWorkflow.ts:73` (currently `plotName = existingPlotId; // TODO: Get actual name from plot list`) — fetch the actual name from the plot list. Promote the other three surviving TODOs (`ipc/config.ts:158`, `StoreSelector/index.tsx:4`, `stacService.ts:1049 — TODO(#137)`) to GitHub issues with remediation hints; replace each in-source TODO with an issue-link reference.

## Success Criteria
- `docs/project_notes/decisions.md` has a new entry explaining the residual vscode type-only cycles
- `LogPanelProps` is the single prop type used by both LogTimeline and LogByFeature
- `shared/components/diff/` is deleted; repo tree no longer contains it
- `pnpm dlx knip` no longer reports files under `specs/**`
- `useLoadWorkflow.ts` shows the real plot name; the three promoted TODOs point to GitHub issues
- Full CI passes (typecheck, lint, build, vitest, pytest, Playwright E2E)

## Dependencies
None — independent of all other code-quality follow-up items (#196 – #202, E11, E12).

## Parallelisation
Fully parallel with #196, #197, #198, #202, and the LinkML-layer items #199 / #200 / #201. Different file footprints; merge-conflict risk is minimal.

## Complexity
Low
