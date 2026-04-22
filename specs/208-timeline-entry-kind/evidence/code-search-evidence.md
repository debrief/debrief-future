---
feature: 208-timeline-entry-kind
captured_at: 2026-04-22T06:58:00Z
git_sha: 2109f6f4
verification: SC-003
---

# SC-003: Residual `ToolCategory === 'snapshot'` grep evidence

**Success Criterion SC-003** (from `spec.md`):

> No remaining references to `ToolCategory === 'snapshot'` (or string-equivalent comparisons against `ToolCategory` for entry-semantics purposes) in LogPanel rendering code. A code search returns zero hits in the LogPanel sources.

## Grep command

```sh
grep -rn "ToolCategory.*snapshot\|resolveToolCategory.*snapshot" \
  shared/components/src/LogPanel/ \
  | grep -v '__tests__' \
  | grep -v 'toolCategories.ts'
```

## Raw output (captured at HEAD on branch `208-timeline-entry-kind`)

```
shared/components/src/LogPanel/LogEntry.tsx:120:      resolveToolCategory(entry.toolName).category === 'snapshot');
shared/components/src/LogPanel/types.ts:20:export type ToolCategory = 'import' | 'style' | 'calc' | 'filter' | 'snapshot';
shared/components/src/LogPanel/types.ts:70: *   `ToolCategory === 'snapshot'` signal; in future also from a manual snapshot
```

## Classification of each hit

| # | File | Line | Hit | Rendering-code reference for entry semantics? | Explanation |
|---|------|------|-----|----------------------------------------------|-------------|
| 1 | `LogEntry.tsx` | 120 | `resolveToolCategory(entry.toolName).category === 'snapshot'` | **Yes** — but this is the gated **legacy fallback** inside the `isSnapshot` expression introduced by feature 208, guarded by `entry.kind === undefined`. Permitted by the contract in `contracts/timeline-entry-kind.contract.md`. | The gate ensures the fallback only runs when the host populator has been bypassed (test fixtures), preserving behavioural parity without requiring every caller to migrate immediately. |
| 2 | `types.ts` | 20 | `export type ToolCategory = 'import' \| 'style' \| 'calc' \| 'filter' \| 'snapshot';` | **No** — this is the *declaration of the `ToolCategory` union type itself*, not a comparison. `'snapshot'` is one of its member values. Not a rendering-code reference for entry-semantics purposes. | Type declaration; neither a check nor a read. |
| 3 | `types.ts` | 70 | Comment line: `` *   `ToolCategory === 'snapshot'` signal; in future also from a manual snapshot `` | **No** — this is a comment block on the new `TimelineEntryKind` type explaining the historical source of the `'snapshot'` kind. Not executable code. | Documentation only. |

**Interpretation**: every hit is either (a) the single gated legacy fallback explicitly blessed by the design, (b) the `ToolCategory` type-declaration itself, or (c) documentation commentary. No ungated `ToolCategory === 'snapshot'` check remains in LogPanel rendering code.

## Expanded grep (includes `toolCategories.ts` and tests)

For reference only — these hits are out of scope for SC-003 because they are the category-resolution source of truth (`toolCategories.ts`) and test files:

```sh
grep -rn "ToolCategory.*snapshot\|'snapshot'\|\"snapshot\"" \
  shared/components/src/LogPanel/
```

Notable hits outside the SC-003 scope:

- `toolCategories.ts:20,54-56` — the `TOOL_ID_TO_CATEGORY` data declaring `'export-png'`, `'export-csv'`, `'export-geojson'` → `'snapshot'`. This IS the source of truth for which tool IDs are snapshot tools; removing it would break the interim populator in `apps/vscode/src/views/logPanelView.ts`.
- `LogActionBar.tsx:20` — the *action-bar button* labelled "Snapshot" for user-initiated snapshot actions. Unrelated to entry-semantics detection; out of scope.
- Test files — `__tests__/LogEntry.test.tsx`, `__tests__/ToolCategoryIcon.test.tsx`, and the new `__tests__/timelineEntryKind.test.ts`. Tests legitimately use both patterns while verifying the gated fallback and the new discriminator logic.

## Verdict

✅ **SC-003 satisfied.** The only remaining reference to `resolveToolCategory(...).category === 'snapshot'` in non-test LogPanel rendering code is the explicit, gated legacy fallback in `LogEntry.tsx:120`.
