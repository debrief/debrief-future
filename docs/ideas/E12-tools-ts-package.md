# Epic E12: Shared @debrief/tools-ts package

## Problem
The TypeScript tool-implementation layer is split unevenly across two apps, with a cross-app deep-import pattern that's hard to reason about:

- `apps/vscode/src/tools/**` owns `setTrackColor`, `applySymbolStyle`, `labelInterval`, `symbolInterval`, `generateReferencePoints`, `generateCoursesSpeeds`, `pointInZoneClassifier`, and orphaned copies of `moveShape` and `enlargeShape`.
- `apps/web-shell/src/tools/**` owns `trackStats`, `rangeBearing`, `areaSummary`, `bufferZoneGenerator`, and its own `moveShape`.
- `apps/web-shell/src/services/toolService.ts` reaches *across app boundaries* into `../../../vscode/src/tools/...` for 11 tools — a working but brittle pattern.
- `moveShape` exists in both apps (95-line TS duplicate, flagged by `jscpd`) with no single canonical source.

Each TypeScript tool implementation also has a cross-language parity pair in `services/calc/debrief_calc/tools/**` (Python), verified against golden tests. The Python side is fine; the TS side is the mess.

## Proposed Solution
Introduce `shared/tools-ts/` as a new workspace package (`@debrief/tools-ts`). Both `apps/vscode` and `apps/web-shell` consume tool implementations from it. Phases can land independently:

### Phase A — Package scaffold
1. Create `shared/tools-ts/` with `package.json` (name `@debrief/tools-ts`), `tsconfig.json`, `src/index.ts`, test config.
2. Add to `pnpm-workspace.yaml`.
3. Establish the tool-module conventions: each tool exports `toolDefinition` (an `MCPToolDefinition`) and `execute` with a typed input/output.
4. Add CI job: build, typecheck, test.

### Phase B — Migrate the safe tools
5. For each tool module currently under `apps/vscode/src/tools/` or `apps/web-shell/src/tools/` that has a single TS implementation, move it to `shared/tools-ts/src/<category>/<tool>/`.
6. Update both apps' `toolService.ts` to import from `@debrief/tools-ts` instead of the per-app paths.
7. Delete the original files.

### Phase C — Resolve the duplicate
8. `moveShape` has two TS copies — they're already 95%+ identical per `jscpd`. Pick one, migrate to `shared/tools-ts/src/shape/manipulation/moveShape.ts`. Delete the other copy. Delete the orphaned `enlargeShape.ts` under `apps/vscode` (web-shell never had one; the Python side is the parity pair).

### Phase D — Drop the deep-import pattern
9. After all consumer imports point at `@debrief/tools-ts`, the `../../../vscode/src/tools/...` cross-app deep imports in `apps/web-shell/src/services/toolService.ts` are gone.

### Non-goals
- No change to the Python-TS parity discipline. Each TS tool still has its Python counterpart; golden tests still validate cross-language parity.
- No change to tool specifications in `shared/tools/**/*.1.0.md` — those remain the spec.

## Success Criteria
- `shared/tools-ts/` exists as a workspace package with build / typecheck / test CI
- Every `apps/*/src/tools/**` TypeScript tool module has been relocated
- No cross-app deep imports remain in either `apps/vscode` or `apps/web-shell`
- `moveShape` and `enlargeShape` have exactly one TS implementation each (or `enlargeShape` is deleted if it's truly unused)
- All pre-existing golden tests and vitest suites pass

## Status
Proposed

## Items
To be allocated by phase on kick-off. Expect one item for the scaffold, then one per category migrated (`track/styling`, `track/analysis`, `track/manipulation`, `shape/manipulation`, `region/analysis`, `sensor/detection`, `reference/generation`, `reference/classification`).

## Parallelisation
Phase A (scaffold) must land first. After that, phase B category migrations are independent — each can be a separate PR. Phase C (duplicate resolution) can happen in parallel with late-phase-B work. Phase D is "confirm and remove" after all consumers are migrated.

No conflict with any other epic or item (#195 – #202, E11).

## Reference
Raised as part of the code-quality review pass; see PR #465 final report (Track 1 / Item 10) for the duplication discovery.
