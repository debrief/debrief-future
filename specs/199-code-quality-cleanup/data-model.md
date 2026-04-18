# Data Model: Code-Quality Cleanup — Small-Bucket Consolidation

**Feature**: 199-code-quality-cleanup
**Date**: 2026-04-18

This feature creates no new runtime data structures, no schema files, and no persisted entities. The "data model" consists of three pseudo-entities whose shape the PR is responsible for — a TypeScript interface, a documentation record, and a tracked-TODO reference.

---

## Entity 1 — `LogPanelProps` (consolidated TypeScript interface)

**Location**: `shared/components/src/LogPanel/types.ts`

**What changes**: `LogPanelProps` already exists (line 193 pre-change). This PR adds any optional fields currently on `LogTimelineProps` / `LogByFeatureProps` that are not yet on `LogPanelProps`, then deletes the two old interfaces and their exports.

**Canonical fields** (after the change — all optional unless marked required):

| Field | Type | Origin | Required? |
|---|---|---|---|
| `entries` | `TimelineEntry[]` | existing on `LogPanelProps` | Required |
| `featureNames` | `Record<string, string>` | existing on `LogPanelProps` | Required |
| `viewMode` | `ViewMode` | existing on `LogPanelProps` | Required |
| `selectedEntryId` | `string \| null` | existing on `LogPanelProps` | Required |
| `filterState` | `FilterState` | existing on `LogPanelProps` | Required |
| `hasActiveSession` | `boolean` | existing on `LogPanelProps` | Required |
| `plotName` | `string \| null` | existing on `LogPanelProps` | Required |
| `actionResultMessage` | `string \| null` | existing on `LogPanelProps` | Required |
| `onMessage` | `(message: LogPanelMessage) => void` | existing on `LogPanelProps` | Optional |
| `onViewModeChange` | `(mode: ViewMode) => void` | existing on `LogPanelProps` | Optional |
| `onFilterStateChange` | `(state: FilterState) => void` | existing on `LogPanelProps` | Optional |
| `onSelectedEntryChange` | `(entryId: string \| null) => void` | existing on `LogPanelProps` | Optional |
| `replayProgress` | `{ current: number; total: number; currentToolId: string; phase: string } \| null` | existing on `LogPanelProps` | Optional |
| `onTuneRequest` | `(activityId, parameter, newValue) => void` | existing on `LogPanelProps` | Optional |
| `onRevertToRequest` | `(activityId: string) => void` | existing on `LogPanelProps` | Optional |
| `onRevertThisRequest` | `(activityId: string) => void` | existing on `LogPanelProps` | Optional |
| `onRestoreRequest` | `(activityId: string) => void` | existing on `LogPanelProps` | Optional |
| `onReplayCancel` | `() => void` | existing on `LogPanelProps` | Optional |
| `onSchemaRequest` | `(toolId: string) => void \| Promise<ReadonlyArray<ParameterSchemaEntry>>` | existing on `LogPanelProps` | Optional |
| `onDisableToggle` | `(activityId: string, disabled: boolean) => void` | existing on `LogPanelProps` + both children | Optional |
| `onRationaleUpdate` | `(activityId: string, rationale: string) => void` | existing on `LogPanelProps` | Optional |
| `className` | `string` | existing on both | Optional |
| `onEntryClick` | `(entry: TimelineEntry) => void` | migrated from children | Optional |
| `onTuneClick` | `(entry: TimelineEntry, parameterName: string) => void` | migrated from children | Optional |
| `onRestoreClick` | `(entry: TimelineEntry) => void` | migrated from children | Optional |
| `editingActivityId` | `string \| null` | migrated from children (Feature 113) | Optional |
| `editingSchema` | `ReadonlyArray<ParameterSchemaEntry> \| null` | migrated from children (Feature 113) | Optional |
| `schemaLoading` | `boolean` | migrated from children (Feature 113) | Optional |
| `schemaError` | `string \| null` | migrated from children (Feature 113) | Optional |
| `rationaleRef` | `React.Ref<HTMLTextAreaElement>` | migrated from children (Feature 113) | Optional |
| `onEditClick` | `(entry: TimelineEntry) => void` | migrated from children (Feature 113) | Optional |
| `onDoneClick` | `(entry: TimelineEntry) => void` | migrated from children (Feature 113) | Optional |
| `onParameterChange` | `(activityId, parameterName, newValue: unknown) => void` | migrated from children (Feature 113) | Optional |
| `onDeleteClick` | `(activityId: string) => void` | migrated from children (Feature 113) | Optional |
| `onRationaleChange` | `(activityId: string, rationale: string) => void` | migrated from children (Feature 113) | Optional |
| `onRetrySchema` | `(toolId: string) => void` | migrated from children (Feature 113) | Optional |

**Deleted exports** (this PR):

- `LogTimelineProps` (was at `types.ts:269`)
- `LogByFeatureProps` (was at `types.ts:301`)
- Corresponding re-exports in `shared/components/src/LogPanel/index.ts` lines 12–13
- Corresponding re-exports in `shared/components/src/index.ts` lines 225–226

**Consumer updates**:

- `LogTimeline.tsx:12` — `import type { LogPanelProps } from './types'`
- `LogTimeline.tsx:34` — annotate props as `LogPanelProps`
- `LogByFeature.tsx:12` — `import type { LogPanelProps } from './types'`
- `LogByFeature.tsx:37` — annotate props as `LogPanelProps`

**Validation**: `pnpm --filter @debrief/components typecheck` must pass. `pnpm --filter @debrief/components test` must pass. No behavioural change is expected.

---

## Entity 2 — ADR-019 (new `decisions.md` entry)

**Location**: `docs/project_notes/decisions.md` — appended after ADR-018 using the file's established format.

**Required fields** (per `decisions.md:5–13`):

| Field | Content |
|---|---|
| Number + date | `### ADR-019: Accepted Type-Only Cycles in VS Code Extension (2026-04-18)` (or next free ADR number if a higher ADR has been merged by then) |
| Context | PR #465 code-quality review found two `import type`-only cycles in `apps/vscode/src/`: `mapPanel → activityPanelView → calcService → mapPanel` (3 type-only edges) and `activityPanelView ↔ resultsPanelService` (2 type-only edges). All edges are type-only and therefore erased at runtime. |
| Decision | Accept the cycles; document them so future refactors know they are a deliberate trade-off rather than a latent bug. |
| Alternatives considered | (a) Extract shared interfaces into a separate module (rejected now — touches five files, out of scope for #199 bundle; captured as the eventual fix); (b) merge offending classes (rejected — loses useful separation of concerns between panel, view, and service). |
| Consequences | ✅ No runtime impact (type-only edges erased at compile time); ✅ Preserves current file layout and testing boundaries; ❌ Any future change from `import type` to runtime `import` would resurrect a real cycle — reviewers must enforce. Eventual fix: interface extraction. |
| Evidence link | Pointer to `specs/199-code-quality-cleanup/research.md` RQ-5 for the file:line evidence. |

**Validation**: grep tests in SC-005 pass (`cycle` and `type-only` both appear exactly once in the new entry's body).

---

## Entity 3 — Tracked TODO reference

**Format**: Every remaining in-source TODO covered by this feature takes the shape `TODO(#NNN): <short summary>` where `NNN` is a GitHub issue number in `debrief/debrief-future`. The short summary is the first clause of the original TODO, preserved verbatim so readers do not need to open the issue to understand intent.

**Instances**:

| Source location | Pre-change text | Post-change text (schematic) | Issue filed? |
|---|---|---|---|
| `apps/loader/src/main/ipc/config.ts:158` | `// TODO: Add "Manage Stores" tab in the future for:` | `// TODO(#NNN): Add "Manage Stores" tab for:` | Yes — new issue. |
| `apps/loader/src/renderer/components/StoreSelector/index.tsx:4` | `* TODO: Add "Create new store" button/link that opens the NoStoresView panel,` | `* TODO(#NNN): Add "Create new store" button/link that opens the NoStoresView panel,` | Yes — new issue. |
| `apps/vscode/src/services/stacService.ts:~1119` | `// TODO(#137): Delegate to Python MCP tool update_temporal_metadata when STAC MCP client is available` | unchanged — already tracked | No — already tracked (audit only). |

**GitHub issue body template** (one per file):

```markdown
Promoted from in-source TODO at <file:line>.

**Remediation hint**: <short description of what should be done>.

Source spec: specs/199-code-quality-cleanup
```

**Validation**: grep for `TODO:` (no parenthesised issue number) in `apps/loader/src/main/ipc/config.ts` and `apps/loader/src/renderer/components/StoreSelector/index.tsx` returns zero matches after the PR lands. Each new `TODO(#NNN):` reference corresponds to an open issue in `debrief/debrief-future`.

---

## State transitions

None. This feature introduces no stateful entity; each sub-change is a one-shot edit, not a lifecycle.
