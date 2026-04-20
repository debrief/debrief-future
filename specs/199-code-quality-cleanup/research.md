# Research: Code-Quality Cleanup — Small-Bucket Consolidation

**Feature**: 199-code-quality-cleanup
**Date**: 2026-04-18

## Research Questions & Findings

The feature spec has no `[NEEDS CLARIFICATION]` markers. The research below fills in the five implementation questions where a decision between reasonable alternatives is required, and records the observed state of the codebase that anchors each of the five sub-changes.

---

### RQ-1: What is the canonical shape of `LogPanelProps`, and does collapsing `LogTimelineProps`/`LogByFeatureProps` onto it require changing its shape?

**Decision**: Keep the existing `LogPanelProps` interface at `shared/components/src/LogPanel/types.ts:193` as-is. `LogTimeline` and `LogByFeature` will import `LogPanelProps` directly; any field in the old interfaces that is **not** already on `LogPanelProps` must be added before the old interfaces are deleted.

**Rationale**: `LogPanelProps` is already the root-component prop type and is a proper superset of what `LogTimeline` / `LogByFeature` need for rendering. The two child-component interfaces are structurally identical to each other and to a subset of `LogPanelProps` (same `entries`, `featureNames`, `viewMode`, `selectedEntryId`, plus a shared set of flip-card callbacks and optional refs). We validate the subset relationship by type-check (a "is-assignable" test at rename time) rather than by eyeballing.

**Findings**:

| Location | Interface | Observed fields |
|---|---|---|
| `shared/components/src/LogPanel/types.ts:193` | `LogPanelProps` | `entries`, `featureNames`, `viewMode`, `selectedEntryId`, `filterState`, `hasActiveSession`, `plotName`, `actionResultMessage`, message/view/filter/selection callbacks, `replayProgress`, tune/revert/restore/replay callbacks, `onSchemaRequest`, `onDisableToggle`, `onRationaleUpdate`, `className`. |
| `shared/components/src/LogPanel/types.ts:269` | `LogTimelineProps` | `entries`, `featureNames`, `viewMode`, `selectedEntryId`, `onEntryClick`, `onTuneClick`, `onRestoreClick`, flip-card fields (`editingActivityId`, `editingSchema`, `schemaLoading`, `schemaError`, `rationaleRef`), `onEditClick`, `onDoneClick`, `onParameterChange`, `onDisableToggle`, `onDeleteClick`, `onRationaleChange`, `onRetrySchema`, `className`. |
| `shared/components/src/LogPanel/types.ts:301` | `LogByFeatureProps` | Structurally identical to `LogTimelineProps`. |
| Consumers | `LogTimeline.tsx`, `LogByFeature.tsx`, `LogPanel/index.ts` (exports), `shared/components/src/index.ts` (re-exports). | 4 files total. |

**Consequences**: A small number of fields exposed on `LogTimelineProps`/`LogByFeatureProps` (e.g., `onEntryClick`, `onTuneClick`, `onRestoreClick`, `editingActivityId`, `editingSchema`, `schemaLoading`, `schemaError`, `rationaleRef`, `onEditClick`, `onDoneClick`, `onParameterChange`, `onDeleteClick`, `onRationaleChange`, `onRetrySchema`) are **not** on the current `LogPanelProps`. These must be added to `LogPanelProps` (all optional) before the old interfaces can be removed, so that `LogTimeline.tsx` and `LogByFeature.tsx` continue to compile with the consolidated type. This is the one piece of actual work in sub-change (b); the rest is mechanical rename.

**Alternatives considered**:
- *Introduce a new name (`LogChildProps`) covering the timeline/by-feature subset*: rejected — yields three interfaces where one suffices and keeps the drift surface alive.
- *Leave `LogPanelProps` unchanged and have `LogTimeline`/`LogByFeature` take a narrower `Pick<LogPanelProps, ...>` type*: rejected — `Pick` list would be long and would itself drift over time.

---

### RQ-2: Where should the knip configuration live, and how narrow should the ignore rule be?

**Decision**: Create a new `knip.json` at the repo root containing only the minimum needed to silence the `specs/**` false-positives (at minimum: `"ignore": ["specs/**"]`; additional knip sections only if required to make knip run at all on this monorepo). No other paths are added.

**Rationale**: No knip config currently exists (`find` at repo root returned zero matches for `knip.*` / `.knip*`, and `package.json` has no `"knip"` key). The source idea (`docs/ideas/199-code-quality-small-bucket.md`) asks specifically for `specs/**` to be excluded; adding anything more broadens the ignore surface and invites silently masking real unused-code findings elsewhere. Starting from "minimum that makes the `specs/**` false-positive go away" keeps FR-010 honest.

**Findings**:
- `knip` is invoked via `pnpm dlx knip` during review (see source idea). It is not a pinned devDependency in root `package.json` (confirmed by inspection — only `@playwright/test`, `@sparticuz/chromium`, `tsx`).
- No `knip.json`, `knip.ts`, `knip.js`, or `"knip"` field in `package.json` exists today.
- Speckit contract `.ts` files under `specs/**` are flagged as "unused" because no production code imports them — that is expected; they are templates / scaffolds.

**Alternatives considered**:
- *Add `knip` as a pinned devDependency and wire it into `task verify`*: explicitly out of scope for this spec (see Out of Scope in spec.md: "any change to knip's treatment of paths outside `specs/**`"). Even a devDep addition enlarges the review footprint without serving FR-009/FR-010. Leaving knip as `pnpm dlx`-invoked is the minimal-change option.
- *Put the ignore in a `package.json` `"knip"` field*: rejected — a standalone `knip.json` is easier for future contributors to find and is idiomatic in the knip docs.
- *Broader ignore (e.g. also `docs/ideas/**`)*: rejected — violates FR-010 and is not asked for by the idea file.

---

### RQ-3: How should the `plotName` placeholder be resolved in `useLoadWorkflow.ts`?

**Decision**: Thread the already-fetched plot list (or a resolver callback) into the `executeLoad` hook and look up the display name for `existingPlotId` from it. If the hook does not already receive the plot list, add a minimal `plots: PlotSummary[]` (or equivalent) argument to `executeLoad` and update its caller in the loader UI to pass the data it already holds.

**Rationale**: The loader already calls `window.electronAPI.listPlots(storePath)` in `apps/loader/src/renderer/hooks/usePlots.ts:33`, so a plot list with display names is available in the render tree before `executeLoad` is invoked. The simplest, non-invasive fix is to pipe that data (or a single `plots.find(p => p.id === existingPlotId)?.name` lookup done at the call site) into the hook rather than having the hook call IPC itself.

**Findings**:
- `apps/loader/src/renderer/hooks/useLoadWorkflow.ts:73` is literally `plotName = existingPlotId; // TODO: Get actual name from plot list`.
- Surrounding code branches (`mode === 'create'`) already assign `plotName = createResult.name`, so the consumer already treats `plotName` as a human-readable label.
- `plotName` flows into the returned object (used by downstream UI strings and telemetry per the spec's acceptance criteria) and into IPC-chained calls.

**Alternatives considered**:
- *Have `useLoadWorkflow` call `listPlots` itself*: rejected — couples a side-effectful IPC to what is today a pure execution hook, and duplicates a fetch that the surrounding component already does.
- *Change the IPC `select-existing-plot` flow to return `{ id, name }` directly*: rejected — larger ripple across main-process IPC contracts; out of proportion for a one-line fix.
- *Pass the full `plot` object rather than just the list*: acceptable fallback if the caller finds it cleaner; functionally equivalent for this fix.

---

### RQ-4: What is the process for promoting each in-source TODO to a GitHub issue, and what happens if the referenced location has moved?

**Decision**: For each of the three TODOs listed below, (i) verify the current location, (ii) file a GitHub issue in `debrief/debrief-future` with a short title, remediation hint, and link back to the source line, (iii) replace the in-source `TODO: …` comment with `TODO(#NNN): <short summary>` pointing at the new issue. For any TODO whose location cannot be found, record the disposition explicitly in the PR description (issue filed against the new location, or "descoped — referent no longer exists") — never silently skip (FR-015).

**Rationale**: Promotion-with-back-reference preserves the in-source breadcrumb a reader gets from a TODO while making the work prioritisable on the backlog alongside everything else. The "never silently skip" rule is a direct response to the `StoreSelector` edge-case noted in the spec.

**Findings — current state of the three TODOs**:

| Target from source idea | Current actual location | Notes |
|---|---|---|
| `apps/loader/src/main/ipc/config.ts:158` | Confirmed — `// TODO: Add "Manage Stores" tab in the future for:` | Existing. File an issue and replace prefix with `TODO(#NNN):`. |
| `StoreSelector/index.tsx:4` (source idea) | `apps/loader/src/renderer/components/StoreSelector/index.tsx:4` — `* TODO: Add "Create new store" button/link that opens the NoStoresView panel,` | Located — the file path in the source idea was relative. File an issue and replace prefix with `TODO(#NNN):`. |
| `stacService.ts:1049 — TODO(#137)` | Closest match at `apps/vscode/src/services/stacService.ts:1119` — `// TODO(#137): Delegate to Python MCP tool update_temporal_metadata when STAC MCP client is available`; a second `TODO(#193-v2)` marker exists at line 1311 | Already promoted (`TODO(#137)`). No action needed for this one beyond documenting in the PR description that it was already tracked; the line number in the source idea is stale (1049 → 1119). |

**Consequences**: Two new GitHub issues will be filed (for the `config.ts` and `StoreSelector/index.tsx` TODOs). The `stacService.ts` TODO is already tracked and will be audited/left alone (FR-014 is satisfied for it by the existing `TODO(#137)` reference). Any additional TODOs discovered during the audit that are outside the three listed are explicitly out of scope and will be called out (not fixed) in the PR description.

**Alternatives considered**:
- *Only replace the TODO text, without filing an issue*: rejected — defeats the purpose of User Story 5.
- *Delete the TODO comment entirely, rely on the issue alone*: rejected — the in-source breadcrumb has non-zero value for contributors reading the file.
- *Use a TODO-tracker tool (e.g., tlint, todo-to-issue Action)*: out of scope — introduces a new dependency for a one-off three-item conversion.

---

### RQ-5: What format should the `decisions.md` entry for the accepted type-only cycles use, and what exact cycles must it name?

**Decision**: Add a new ADR entry using the numbered `### ADR-NNN: <title> (YYYY-MM-DD)` format already established in `docs/project_notes/decisions.md`, using the next free ADR number after the current highest (ADR-018). The entry names both cycles explicitly and states the `import type`-only rationale, the runtime-erasure consequence, and the interface-extraction direction as the eventual fix.

**Rationale**: `docs/project_notes/decisions.md` has an established format (ADR-001 through ADR-018, each with Context / Decision / Alternatives / Consequences sections). Following it keeps the file navigable by the existing heading structure, makes the entry discoverable by the grep tests in SC-005, and avoids introducing a second format.

**Findings — cycles confirmed to still exist (2026-04-18)**:

| Cycle | Evidence |
|---|---|
| `mapPanel → activityPanelView → calcService → mapPanel` | `apps/vscode/src/webview/mapPanel.ts:25` imports-type `ActivityPanelViewProvider` from `../views/activityPanelView`; `apps/vscode/src/views/activityPanelView.ts:25` imports-type `CalcService` from `../services/calcService`; `apps/vscode/src/services/calcService.ts:33` imports-type `MapPanel` from `../webview/mapPanel`. All three edges are `import type`. |
| `activityPanelView ↔ resultsPanelService` | `apps/vscode/src/views/activityPanelView.ts:29` imports-type `ResultsPanelService` from `../services/resultsPanelService`; `apps/vscode/src/services/resultsPanelService.ts:16` imports-type `ActivityPanelViewProvider` from `../views/activityPanelView`. Both edges are `import type`. |

Both cycles survive at the time of writing, which satisfies the Assumption in the spec ("if any have already been resolved by another PR, FR-001 applies only to those that remain"). If either is eliminated before merge, the ADR entry is scoped down accordingly.

**Consequences**: Future readers searching `decisions.md` for "cycle" or "type-only" find a single entry with both exact paths called out. The next file-system refactor that would unknowingly eliminate one of these cycles (by extracting interfaces) has a clear pointer to this ADR.

**Alternatives considered**:
- *Add the note to `ARCHITECTURE.md`*: rejected — `ARCHITECTURE.md` describes the planned (not actual) architecture; `decisions.md` is the place for accepted-trade-off records.
- *Inline the explanation in the files containing the cycle*: rejected — the explanation is cross-cutting across five files; one central record is easier to maintain and discover.
- *Open a tracking issue for the interface extraction and reference only that*: rejected — the issue can be linked from the ADR, but the ADR itself is the durable record of the "accepted cycle" decision.

---

## Summary of decisions

| Sub-change | Decision |
|---|---|
| (a) `decisions.md` entry | New ADR-019 (or next free number) following existing format; names both cycles and the interface-extraction fix direction. |
| (b) LogPanel prop merge | `LogPanelProps` stays canonical; add missing optional fields; remove two old interfaces; update 4 consumer files. |
| (c) `diff/` removal | Delete `shared/components/diff/` tree; sweep config files for stale references. |
| (d) knip `specs/**` ignore | New `knip.json` at repo root with minimum ignore rule. |
| (e) loader `plotName` fix + TODO promotion | Resolve plot name from existing plot list; file 2 new GitHub issues + replace TODO prefixes with `TODO(#NNN):`; confirm `TODO(#137)` is already tracked. |

All decisions are reversible and self-contained. No `[NEEDS CLARIFICATION]` remains.
