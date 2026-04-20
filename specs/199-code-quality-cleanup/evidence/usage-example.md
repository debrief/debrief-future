# Usage example: Code-Quality Cleanup — Small-Bucket Consolidation

This feature is a **single bundled PR** combining five low-risk follow-ups
from the PR #465 code-quality review. There is no end-user feature to demo;
instead this document walks a contributor through what changed and why, with
before/after snippets for each sub-change.

---

## 1. knip false-positive silencing (P1)

**Before** (running `pnpm dlx knip` against `main`):

```text
Unused files (119)
…
specs/001-shared-react-components/contracts/types.d.ts
specs/001-wire-file-actions/contracts/messages.ts
specs/025-time-controller/contracts/TimeController.d.ts
…  (57 entries under specs/**, drowning the 62 real findings)
```

**After**:

```text
Unused files (62)
…  (no specs/** entries — real findings are now visible)
```

Plus, on a fresh clone, `pnpm install` resolves `knip@5.88.1` deterministically
(no more `pnpm dlx knip@latest` drift across reviewers, CI, and contributors).

**Diff**:

```diff
+ // package.json
+ "devDependencies": {
+   "knip": "5.88.1"
+ }
```

```json
// knip.json (new)
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "ignore": ["specs/**"],
  "workspaces": {
    "apps/spec-navigator": {
      "playwright": false
    }
  }
}
```

The `apps/spec-navigator` workspace stanza disables knip's auto-loaded
playwright plugin only for that workspace — workaround for a knip 5.x bug
that fails on `import.meta.url` in the workspace's
`playwright.config.ts`. Narrowest scope possible per FR-010.

---

## 2. LogPanel prop consolidation (P1)

**Before** (`shared/components/src/LogPanel/types.ts`):

```ts
export interface LogPanelProps { /* root-only fields */ }
export interface LogTimelineProps { /* near-identical to LogByFeatureProps */ }
export interface LogByFeatureProps { /* near-identical to LogTimelineProps */ }
```

A contributor adding a new field had to remember to update **three** interfaces.

**After**:

```ts
export interface LogPanelProps {
  // root-required fields (entries, featureNames, viewMode, selectedEntryId)
  // root-only optional fields (filterState?, hasActiveSession?, plotName?, actionResultMessage?)
  // shared optional callbacks (onMessage?, onTuneRequest?, …)

  // --- Fields previously held by per-view child prop interfaces. ---
  onEntryClick?: (entry: TimelineEntry) => void;
  onTuneClick?: (entry: TimelineEntry, parameterName: string) => void;
  onRestoreClick?: (entry: TimelineEntry) => void;
  editingActivityId?: string | null;
  editingSchema?: ReadonlyArray<ParameterSchemaEntry> | null;
  schemaLoading?: boolean;
  schemaError?: string | null;
  rationaleRef?: React.Ref<HTMLTextAreaElement>;
  onEditClick?: (entry: TimelineEntry) => void;
  onDoneClick?: (entry: TimelineEntry) => void;
  onParameterChange?: (activityId, parameterName, newValue: unknown) => void;
  onDeleteClick?: (activityId: string) => void;
  onRationaleChange?: (activityId: string, rationale: string) => void;
  onRetrySchema?: (toolId: string) => void;
}
// LogTimelineProps and LogByFeatureProps removed.
```

`LogTimeline.tsx` and `LogByFeature.tsx` both now annotate their props as
`LogPanelProps`. The two child interfaces have been deleted from
`shared/components/src/LogPanel/types.ts`, `shared/components/src/LogPanel/index.ts`,
and `shared/components/src/index.ts` — a repo-wide grep confirms zero remaining
references.

---

## 3. ADR-019 — type-only cycles documented (P2)

`docs/project_notes/decisions.md` gains exactly one new entry:

```markdown
### ADR-019: Accept Type-Only Cycles in VS Code Extension View↔Service Layer (2026-04-18)

**Context:**
- The VS Code extension contains two `import type`-only cycles between view
  providers and the services they delegate to:
  - **3-node cycle:** mapPanel.ts ↔ activityPanelView.ts ↔ calcService.ts
  - **2-node cycle:** activityPanelView.ts ↔ resultsPanelService.ts
- All edges are `import type` only (erased at runtime — no JS-emit edge).

**Decision:** accept both cycles; document them so future refactors know
they are a deliberate trade-off, not a latent bug.

**Eventual fix:** interface extraction — define the cross-cutting type
contract in a separate, dependency-free module. Incrementally applicable.
```

(Full text in `evidence/adr-019.md`.)

---

## 4. Loader `plotName` fix (P2)

**Before** (`apps/loader/src/renderer/hooks/useLoadWorkflow.ts:73`):

```ts
} else {
  if (!existingPlotId) {
    throw new Error('No plot selected');
  }
  plotId = existingPlotId;
  plotName = existingPlotId; // TODO: Get actual name from plot list
}
```

A user loading a REP file into an existing plot whose display name was
"Alpha Exercise Run" but whose id was "plot-abc-123" saw "plot-abc-123" in
the loader's UI strings and telemetry — confusing, and a latent TODO marker
in a user-facing code path.

**After**:

```ts
} else {
  if (!existingPlotId) {
    throw new Error('No plot selected');
  }
  const selectedPlot = plots?.find((p) => p.id === existingPlotId);
  if (!selectedPlot) {
    throw new Error(`Plot ${existingPlotId} not found in supplied plot list`);
  }
  plotId = existingPlotId;
  plotName = selectedPlot.name;
}
```

The hook now accepts an optional `plots: ReadonlyArray<PlotInfo>` parameter;
the single in-repo caller (`App.tsx`) passes `state.selectedPlot ? [state.selectedPlot] : undefined`.

Backed by a new vitest at `apps/loader/tests/unit/useLoadWorkflow.test.ts`
(2 tests; revert-and-red sanity-checked — see `evidence/loader-plotname.md`).

---

## 5. TODO promotion (P2)

Three surviving in-source TODOs audited:

| File | Disposition | Issue |
|---|---|---|
| `apps/loader/src/main/ipc/config.ts:158` | promoted | **#472** (new) |
| `apps/loader/src/renderer/components/StoreSelector/index.tsx:4` | promoted | **#473** (new) |
| `apps/vscode/src/services/stacService.ts:1119` | audited | **#137** (closed, **stale** — flagged for separate follow-up; out of scope per FR-013) |

Pre-push guard ensures no `TODO(#NNN)` literal anti-pattern ever ships:

```text
$ grep -rn "TODO(#NNN)" apps/ services/ shared/
(zero matches)
```

---

## 6. `shared/components/diff/` removal (P3)

**Before**: nine files (package.json, src/, tests/, tsconfig.json,
vitest.config.ts) under `shared/components/diff/` — a staging artefact added
in commit `05e6289` with no consumer anywhere in the monorepo and no entry
in `pnpm-workspace.yaml` (other than the implicit `shared/*` glob).

**After**: directory deleted via `git rm -r`. Sweep for stale references
in `tsconfig*.json`, `pnpm-workspace.yaml`, build scripts, and `knip.json`
returns zero hits. Recoverable from git history at the deletion commit if
the integration work ever resumes.

---

## How to run the verification yourself

```sh
# 1. Confirm knip silences specs/** without hiding other findings
pnpm exec knip 2>&1 | grep -c '^specs/'   # must print 0

# 2. Confirm LogPanel rename grep is clean
grep -rn "LogTimelineProps\|LogByFeatureProps" shared/ apps/ services/   # must print nothing

# 3. Confirm TODO promotions ship with real issue numbers
grep -rn "TODO(#NNN)" apps/ services/ shared/   # must print nothing

# 4. Confirm the loader regression test exists and is green
pnpm --filter debrief-loader test

# 5. Confirm shared/components/diff/ is gone
test ! -d shared/components/diff && echo OK   # must print OK

# 6. Confirm ADR-019 is discoverable
grep -i "type-only" docs/project_notes/decisions.md   # must match in ADR-019

# 7. Full CI gate
task verify   # or: uv run ruff check . && pnpm lint && uv run pyright \
              # && pnpm -r typecheck && uv run pytest \
              # && pnpm --filter '!@debrief/web-shell' test
```
